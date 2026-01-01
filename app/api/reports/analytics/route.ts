import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";

/**
 * Optimized analytics endpoint for sales and profit data
 * Returns aggregated data grouped by date for charts and dashboards
 */
async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const groupBy = searchParams.get("group_by") || "day"; // day, week, month

    // Build date filter
    let dateFilter = "";
    const args: (string | number)[] = [];

    if (startDate) {
      dateFilter += " AND datetime(created_at) >= datetime(?)";
      args.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      dateFilter += " AND datetime(created_at) <= datetime(?)";
      args.push(`${endDate}T23:59:59.999Z`);
    }

    // Determine date grouping
    let dateGrouping = "DATE(created_at)";
    if (groupBy === "week") {
      dateGrouping = "strftime('%Y-W%W', created_at)";
    } else if (groupBy === "month") {
      dateGrouping = "strftime('%Y-%m', created_at)";
    }

    // First, get revenue and sales count grouped by date (from sales table directly)
    const revenueSql = `
      SELECT 
        ${dateGrouping} as date,
        COUNT(*) as total_sales,
        SUM(final_amount) as total_revenue,
        AVG(final_amount) as average_order_value
      FROM sales
      WHERE 1=1 ${dateFilter}
      GROUP BY ${dateGrouping}
      ORDER BY date ASC
    `;

    const revenueResult = await client.execute({ sql: revenueSql, args });

    // Get refunds grouped by date (to subtract from revenue)
    const refundsSql = `
      SELECT 
        ${dateGrouping} as date,
        COALESCE(SUM(refund_amount), 0) as total_refunds
      FROM returns
      WHERE 1=1 ${dateFilter}
      GROUP BY ${dateGrouping}
    `;

    const refundsResult = await client.execute({ sql: refundsSql, args });

    // Get gross profit grouped by date (from sale items)
    const grossProfitSql = `
      SELECT 
        ${dateGrouping.replace("created_at", "s.created_at")} as date,
        COALESCE(SUM((si.unit_price - si.cost_price) * si.quantity), 0) as gross_profit
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1 ${dateFilter.replace(/created_at/g, "s.created_at")}
      GROUP BY ${dateGrouping.replace("created_at", "s.created_at")}
      ORDER BY date ASC
    `;

    const grossProfitResult = await client.execute({
      sql: grossProfitSql,
      args,
    });

    // Get returned profit grouped by date (from return items)
    const returnedProfitSql = `
      SELECT 
        ${dateGrouping.replace("created_at", "r.created_at")} as date,
        COALESCE(SUM((ri.unit_price - si.cost_price) * ri.quantity), 0) as returned_profit
      FROM returns r
      JOIN return_items ri ON r.id = ri.return_id
      JOIN sale_items si ON ri.sale_item_id = si.id
      WHERE 1=1 ${dateFilter.replace(/created_at/g, "r.created_at")}
      GROUP BY ${dateGrouping.replace("created_at", "r.created_at")}
    `;

    const returnedProfitResult = await client.execute({
      sql: returnedProfitSql,
      args,
    });

    // Merge revenue and profit data by date
    const revenueMap = new Map(
      revenueResult.rows.map((row: any) => [
        row.date,
        {
          total_sales: row.total_sales,
          total_revenue: row.total_revenue || 0,
          average_order_value: row.average_order_value || 0,
        },
      ])
    );

    const refundsMap = new Map(
      refundsResult.rows.map((row: any) => [row.date, row.total_refunds || 0])
    );

    const grossProfitMap = new Map(
      grossProfitResult.rows.map((row: any) => [
        row.date,
        row.gross_profit || 0,
      ])
    );

    const returnedProfitMap = new Map(
      returnedProfitResult.rows.map((row: any) => [
        row.date,
        row.returned_profit || 0,
      ])
    );

    // Combine data (subtract refunds from revenue, subtract returned profit from gross profit)
    const data = Array.from(revenueMap.keys()).map((date) => ({
      date,
      total_sales: revenueMap.get(date)!.total_sales,
      total_revenue:
        revenueMap.get(date)!.total_revenue - (refundsMap.get(date) || 0),
      total_profit:
        (grossProfitMap.get(date) || 0) - (returnedProfitMap.get(date) || 0),
      average_order_value: revenueMap.get(date)!.average_order_value,
    }));

    // Calculate summary totals
    const summarySql = `
      SELECT 
        COUNT(*) as total_sales,
        SUM(final_amount) as total_revenue,
        AVG(final_amount) as average_order_value
      FROM sales
      WHERE 1=1 ${dateFilter}
    `;

    const summaryRevenueResult = await client.execute({
      sql: summarySql,
      args,
    });

    // Get total refunds for the period
    const summaryRefundsSql = `
      SELECT COALESCE(SUM(refund_amount), 0) as total_refunds
      FROM returns
      WHERE 1=1 ${dateFilter}
    `;

    const summaryRefundsResult = await client.execute({
      sql: summaryRefundsSql,
      args,
    });

    const summaryRefunds =
      (summaryRefundsResult.rows[0] as unknown as { total_refunds: number })
        .total_refunds || 0;

    // Get gross profit for period
    const grossProfitSummarySql = `
      SELECT COALESCE(SUM((si.unit_price - si.cost_price) * si.quantity), 0) as gross_profit
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1 ${dateFilter.replace(/created_at/g, "s.created_at")}
    `;

    const grossProfitSummaryResult = await client.execute({
      sql: grossProfitSummarySql,
      args,
    });

    // Get returned profit for period
    const returnedProfitSummarySql = `
      SELECT COALESCE(SUM((ri.unit_price - si.cost_price) * ri.quantity), 0) as returned_profit
      FROM returns r
      JOIN return_items ri ON r.id = ri.return_id
      JOIN sale_items si ON ri.sale_item_id = si.id
      WHERE 1=1 ${dateFilter.replace(/created_at/g, "r.created_at")}
    `;

    const returnedProfitSummaryResult = await client.execute({
      sql: returnedProfitSummarySql,
      args,
    });

    const summaryRevenue = summaryRevenueResult.rows[0] as unknown as {
      total_sales: number;
      total_revenue: number;
      average_order_value: number;
    };

    const summaryGrossProfit =
      (
        grossProfitSummaryResult.rows[0] as unknown as {
          gross_profit: number;
        }
      ).gross_profit || 0;

    const summaryReturnedProfit =
      (
        returnedProfitSummaryResult.rows[0] as unknown as {
          returned_profit: number;
        }
      ).returned_profit || 0;

    const totalProfit = summaryGrossProfit - summaryReturnedProfit;

    // Calculate net revenue (gross revenue minus refunds)
    const netRevenue = (summaryRevenue.total_revenue || 0) - summaryRefunds;

    const summary = {
      totalSales: summaryRevenue.total_sales || 0,
      totalRevenue: netRevenue,
      totalProfit: totalProfit,
      averageOrderValue: summaryRevenue.average_order_value || 0,
      profitMargin:
        netRevenue > 0 ? ((totalProfit / netRevenue) * 100).toFixed(2) : "0.00",
    };

    return NextResponse.json({
      data,
      summary,
    });
  } catch (error) {
    console.error("Error generating analytics:", error);
    return NextResponse.json(
      { error: "Failed to generate analytics" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);

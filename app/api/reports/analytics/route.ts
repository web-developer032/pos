import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { sqlQuery } from "@/lib/db";

/**
 * Optimized analytics endpoint for sales and profit data
 * Returns aggregated data grouped by date for charts and dashboards
 */
async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const groupBy = searchParams.get("group_by") || "day";

    let dateFilter = "";
    const args: (string | number)[] = [];

    if (startDate) {
      dateFilter += " AND created_at >= ?";
      args.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      dateFilter += " AND created_at <= ?";
      args.push(`${endDate}T23:59:59.999Z`);
    }

    let dateGrouping = "(created_at)::date";
    if (groupBy === "week") {
      dateGrouping = "date_trunc('week', created_at)::date";
    } else if (groupBy === "month") {
      dateGrouping = "to_char(created_at, 'YYYY-MM')";
    }

    const revenueSql = `
      SELECT 
        ${dateGrouping} as date,
        COUNT(*)::bigint as total_sales,
        COALESCE(SUM(final_amount), 0) as total_revenue,
        COALESCE(AVG(final_amount), 0) as average_order_value
      FROM sales
      WHERE 1=1 ${dateFilter}
      GROUP BY ${dateGrouping}
      ORDER BY date ASC
    `;

    const revenueRows = await sqlQuery(revenueSql, args);

    const refundsSql = `
      SELECT 
        ${dateGrouping} as date,
        COALESCE(SUM(refund_amount), 0) as total_refunds
      FROM returns
      WHERE 1=1 ${dateFilter}
      GROUP BY ${dateGrouping}
    `;

    const refundsRows = await sqlQuery(refundsSql, args);

    const grossProfitSql = `
      SELECT 
        ${dateGrouping.replace(/created_at/g, "s.created_at")} as date,
        COALESCE(SUM((si.unit_price - si.cost_price) * si.quantity), 0) as gross_profit
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1 ${dateFilter.replace(/created_at/g, "s.created_at")}
      GROUP BY ${dateGrouping.replace(/created_at/g, "s.created_at")}
      ORDER BY date ASC
    `;

    const grossProfitRows = await sqlQuery(grossProfitSql, args);

    const returnedProfitSql = `
      SELECT 
        ${dateGrouping.replace(/created_at/g, "r.created_at")} as date,
        COALESCE(SUM((ri.unit_price - si.cost_price) * ri.quantity), 0) as returned_profit
      FROM returns r
      JOIN return_items ri ON r.id = ri.return_id
      JOIN sale_items si ON ri.sale_item_id = si.id
      WHERE 1=1 ${dateFilter.replace(/created_at/g, "r.created_at")}
      GROUP BY ${dateGrouping.replace(/created_at/g, "r.created_at")}
    `;

    const returnedProfitRows = await sqlQuery(returnedProfitSql, args);

    const revenueMap = new Map(
      (revenueRows as Record<string, unknown>[]).map((row) => [
        row.date,
        {
          total_sales: Number(row.total_sales ?? 0),
          total_revenue: Number(row.total_revenue ?? 0),
          average_order_value: Number(row.average_order_value ?? 0),
        },
      ])
    );

    const refundsMap = new Map(
      (refundsRows as Record<string, unknown>[]).map((row) => [
        row.date,
        Number(row.total_refunds ?? 0),
      ])
    );

    const grossProfitMap = new Map(
      (grossProfitRows as Record<string, unknown>[]).map((row) => [
        row.date,
        Number(row.gross_profit ?? 0),
      ])
    );

    const returnedProfitMap = new Map(
      (returnedProfitRows as Record<string, unknown>[]).map((row) => [
        row.date,
        Number(row.returned_profit ?? 0),
      ])
    );

    const data = Array.from(revenueMap.keys()).map((date) => ({
      date,
      total_sales: revenueMap.get(date)!.total_sales,
      total_revenue:
        revenueMap.get(date)!.total_revenue - (refundsMap.get(date) || 0),
      total_profit:
        (grossProfitMap.get(date) || 0) - (returnedProfitMap.get(date) || 0),
      average_order_value: revenueMap.get(date)!.average_order_value,
    }));

    const summarySql = `
      SELECT 
        COUNT(*)::bigint as total_sales,
        COALESCE(SUM(final_amount), 0) as total_revenue,
        COALESCE(AVG(final_amount), 0) as average_order_value
      FROM sales
      WHERE 1=1 ${dateFilter}
    `;

    const summaryRevenueRows = await sqlQuery(summarySql, args);

    const summaryRefundsSql = `
      SELECT COALESCE(SUM(refund_amount), 0) as total_refunds
      FROM returns
      WHERE 1=1 ${dateFilter}
    `;

    const summaryRefundsRows = await sqlQuery(summaryRefundsSql, args);
    const summaryRefunds = Number(
      (summaryRefundsRows[0] as Record<string, unknown>)?.total_refunds ?? 0
    );

    const grossProfitSummarySql = `
      SELECT COALESCE(SUM((si.unit_price - si.cost_price) * si.quantity), 0) as gross_profit
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1 ${dateFilter.replace(/created_at/g, "s.created_at")}
    `;

    const grossProfitSummaryRows = await sqlQuery(grossProfitSummarySql, args);

    const returnedProfitSummarySql = `
      SELECT COALESCE(SUM((ri.unit_price - si.cost_price) * ri.quantity), 0) as returned_profit
      FROM returns r
      JOIN return_items ri ON r.id = ri.return_id
      JOIN sale_items si ON ri.sale_item_id = si.id
      WHERE 1=1 ${dateFilter.replace(/created_at/g, "r.created_at")}
    `;

    const returnedProfitSummaryRows = await sqlQuery(
      returnedProfitSummarySql,
      args
    );

    const summaryRevenue = summaryRevenueRows[0] as Record<string, unknown>;
    const summaryGrossProfit = Number(
      (grossProfitSummaryRows[0] as Record<string, unknown>)?.gross_profit ?? 0
    );
    const summaryReturnedProfit = Number(
      (returnedProfitSummaryRows[0] as Record<string, unknown>)
        ?.returned_profit ?? 0
    );

    const totalProfit = summaryGrossProfit - summaryReturnedProfit;
    const netRevenue =
      Number(summaryRevenue?.total_revenue ?? 0) - summaryRefunds;

    const summary = {
      totalSales: Number(summaryRevenue?.total_sales ?? 0),
      totalRevenue: netRevenue,
      totalProfit,
      averageOrderValue: Number(summaryRevenue?.average_order_value ?? 0),
      profitMargin:
        netRevenue > 0
          ? ((totalProfit / netRevenue) * 100).toFixed(2)
          : "0.00",
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

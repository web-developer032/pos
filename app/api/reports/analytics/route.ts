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
      dateFilter += " AND created_at >= ?";
      args.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      dateFilter += " AND created_at <= ?";
      args.push(`${endDate} 23:59:59`);
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

    // Then, get profit grouped by date (needs JOIN with sale_items for cost calculation)
    const profitSql = `
      SELECT 
        ${dateGrouping.replace("created_at", "s.created_at")} as date,
        COALESCE(
          SUM((si.unit_price - si.cost_price) * si.quantity)
          -
          COALESCE(
            (SELECT SUM((ri.unit_price - si2.cost_price) * ri.quantity)
             FROM return_items ri
             JOIN returns r ON ri.return_id = r.id
             JOIN sale_items si2 ON ri.sale_item_id = si2.id
             WHERE r.sale_id = s.id),
            0
          ),
          0
        ) as total_profit
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1 ${dateFilter.replace(/created_at/g, "s.created_at")}
      GROUP BY ${dateGrouping.replace("created_at", "s.created_at")}
      ORDER BY date ASC
    `;

    const profitResult = await client.execute({ sql: profitSql, args });

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

    const profitMap = new Map(
      profitResult.rows.map((row: any) => [row.date, row.total_profit || 0])
    );

    // Combine data
    const data = Array.from(revenueMap.keys()).map((date) => ({
      date,
      total_sales: revenueMap.get(date)!.total_sales,
      total_revenue: revenueMap.get(date)!.total_revenue,
      total_profit: profitMap.get(date) || 0,
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

    const profitSummarySql = `
      SELECT 
        COALESCE(
          SUM((si.unit_price - si.cost_price) * si.quantity)
          -
          COALESCE(
            (SELECT SUM((ri.unit_price - si2.cost_price) * ri.quantity)
             FROM return_items ri
             JOIN returns r ON ri.return_id = r.id
             JOIN sale_items si2 ON ri.sale_item_id = si2.id
             WHERE r.sale_id = s.id),
            0
          ),
          0
        ) as total_profit
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1 ${dateFilter.replace(/created_at/g, "s.created_at")}
    `;

    const summaryProfitResult = await client.execute({
      sql: profitSummarySql,
      args,
    });

    const summaryRevenue = summaryRevenueResult.rows[0] as unknown as {
      total_sales: number;
      total_revenue: number;
      average_order_value: number;
    };

    const summaryProfit = summaryProfitResult.rows[0] as unknown as {
      total_profit: number;
    };

    const summary = {
      totalSales: summaryRevenue.total_sales || 0,
      totalRevenue: summaryRevenue.total_revenue || 0,
      totalProfit: summaryProfit.total_profit || 0,
      averageOrderValue: summaryRevenue.average_order_value || 0,
      profitMargin:
        summaryRevenue.total_revenue > 0
          ? (
              (summaryProfit.total_profit / summaryRevenue.total_revenue) *
              100
            ).toFixed(2)
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

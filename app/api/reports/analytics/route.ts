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
      dateFilter += " AND s.created_at >= ?";
      args.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      dateFilter += " AND s.created_at <= ?";
      args.push(`${endDate} 23:59:59`);
    }

    // Determine date grouping
    let dateGrouping = "DATE(s.created_at)";
    if (groupBy === "week") {
      dateGrouping = "strftime('%Y-W%W', s.created_at)";
    } else if (groupBy === "month") {
      dateGrouping = "strftime('%Y-%m', s.created_at)";
    }

    // Optimized query: Get aggregated sales and net profit (after returns) data grouped by date
    const sql = `
      SELECT 
        ${dateGrouping} as date,
        COUNT(DISTINCT s.id) as total_sales,
        COALESCE(SUM(s.final_amount), 0) as total_revenue,
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
        ) as total_profit,
        COALESCE(AVG(s.final_amount), 0) as average_order_value
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1 ${dateFilter}
      GROUP BY ${dateGrouping}
      ORDER BY date ASC
    `;

    const result = await client.execute({ sql, args });

    // Calculate summary totals with net profit (after returns)
    const summarySql = `
      SELECT 
        COUNT(DISTINCT s.id) as total_sales,
        COALESCE(SUM(s.final_amount), 0) as total_revenue,
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
        ) as total_profit,
        COALESCE(AVG(s.final_amount), 0) as average_order_value
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1 ${dateFilter}
    `;

    const summaryResult = await client.execute({ sql: summarySql, args });
    const summary = summaryResult.rows[0] as unknown as {
      total_sales: number;
      total_revenue: number;
      total_profit: number;
      average_order_value: number;
    };

    return NextResponse.json({
      data: result.rows,
      summary: {
        totalSales: summary.total_sales || 0,
        totalRevenue: summary.total_revenue || 0,
        totalProfit: summary.total_profit || 0,
        averageOrderValue: summary.average_order_value || 0,
        profitMargin: summary.total_revenue > 0 
          ? ((summary.total_profit / summary.total_revenue) * 100).toFixed(2)
          : "0.00",
      },
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


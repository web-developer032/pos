import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let sql = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_sales,
        SUM(final_amount) as total_revenue,
        AVG(final_amount) as average_order_value
      FROM sales
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (startDate) {
      // Use datetime() to normalize timestamp formats for comparison
      sql += " AND datetime(created_at) >= datetime(?)";
      args.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      // Use datetime() to normalize timestamp formats for comparison
      sql += " AND datetime(created_at) <= datetime(?)";
      args.push(`${endDate}T23:59:59.999Z`);
    }

    sql += " GROUP BY DATE(created_at) ORDER BY date";

    const result = await client.execute({ sql, args });
    return NextResponse.json({ report: result.rows });
  } catch (error) {
    console.error("Error generating sales report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);

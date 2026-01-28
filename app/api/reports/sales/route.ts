import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { sqlQuery } from "@/lib/db";

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let sql = `
      SELECT 
        (created_at)::date as date,
        COUNT(*)::bigint as total_sales,
        COALESCE(SUM(final_amount), 0) as total_revenue,
        COALESCE(AVG(final_amount), 0) as average_order_value
      FROM sales
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (startDate) {
      sql += " AND created_at >= ?";
      args.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      sql += " AND created_at <= ?";
      args.push(`${endDate}T23:59:59.999Z`);
    }

    sql += " GROUP BY (created_at)::date ORDER BY date";

    const rows = await sqlQuery(sql, args);
    return NextResponse.json({ report: rows });
  } catch (error) {
    console.error("Error generating sales report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);

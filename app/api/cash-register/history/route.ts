import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/db";

// GET /api/cash-register/history - Get past sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await client.execute({
      sql: `SELECT COUNT(*) as count FROM cash_register_sessions`,
      args: [],
    });
    const total = (countResult.rows[0] as unknown as { count: number }).count;

    // Get sessions with user info
    const result = await client.execute({
      sql: `
        SELECT 
          crs.*,
          u.username as user_name
        FROM cash_register_sessions crs
        LEFT JOIN users u ON crs.user_id = u.id
        ORDER BY crs.opened_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    });

    return NextResponse.json({
      sessions: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching session history:", error);
    return NextResponse.json(
      { error: "Failed to fetch session history" },
      { status: 500 }
    );
  }
}

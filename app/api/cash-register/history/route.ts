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
          crs.id,
          crs.user_id,
          crs.opening_balance,
          crs.closing_balance,
          crs.expected_balance,
          crs.variance,
          crs.status,
          crs.opened_at,
          crs.closed_at,
          crs.notes,
          u.username as user_name
        FROM cash_register_sessions crs
        LEFT JOIN users u ON crs.user_id = u.id
        ORDER BY crs.opened_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    });

    // Convert rows to plain objects to avoid BigInt serialization issues
    const sessions = result.rows.map((row) => {
      const r = row as unknown as {
        id: number | bigint;
        user_id: number;
        opening_balance: number;
        closing_balance: number | null;
        expected_balance: number | null;
        variance: number | null;
        status: string;
        opened_at: string;
        closed_at: string | null;
        notes: string | null;
        user_name: string | null;
      };
      return {
        id: Number(r.id),
        user_id: r.user_id,
        opening_balance: r.opening_balance,
        closing_balance: r.closing_balance,
        expected_balance: r.expected_balance,
        variance: r.variance,
        status: r.status,
        opened_at: r.opened_at,
        closed_at: r.closed_at,
        notes: r.notes,
        user_name: r.user_name,
      };
    });

    return NextResponse.json({
      sessions,
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

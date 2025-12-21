import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/db";
import {
  serializeSession,
  SessionRow,
  SESSION_SELECT_SQL,
} from "@/lib/utils/cashRegisterHelpers";

// Disable caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      sql: `${SESSION_SELECT_SQL} ORDER BY crs.opened_at DESC LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });

    // Serialize all sessions
    const sessions = result.rows.map((row) =>
      serializeSession(row as unknown as SessionRow)
    );

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

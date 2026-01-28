import { NextRequest, NextResponse } from "next/server";
import { sqlQuery } from "@/lib/db";
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

    const countRows = await sqlQuery<{ count: number }>(
      "SELECT COUNT(*)::bigint as count FROM cash_register_sessions",
      []
    );
    const total = Number(countRows[0]?.count ?? 0);

    const rows = await sqlQuery(
      `${SESSION_SELECT_SQL} ORDER BY crs.opened_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const sessions = rows.map((row) =>
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

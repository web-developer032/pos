import { NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { sqlQuery } from "@/lib/db";
import {
  serializeSession,
  SessionRow,
  SESSION_SELECT_SQL,
} from "@/lib/utils/cashRegisterHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = (page - 1) * limit;

    const countRows = await sqlQuery<{ count: number }>(
      "SELECT COUNT(*)::bigint as count FROM cash_register_sessions WHERE user_id = ?",
      [userId]
    );
    const total = Number(countRows[0]?.count ?? 0);

    const rows = await sqlQuery(
      `${SESSION_SELECT_SQL} WHERE crs.user_id = ? ORDER BY crs.opened_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
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

export const GET = requireAuth(getHandler, { requiredFeature: "cash_register" });

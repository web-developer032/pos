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
    const rows = await sqlQuery<SessionRow>(
      `${SESSION_SELECT_SQL} WHERE crs.status = 'open' AND crs.user_id = ? ORDER BY crs.opened_at DESC LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ session: null, isOpen: false });
    }

    return NextResponse.json({
      session: serializeSession(rows[0]),
      isOpen: true,
    });
  } catch (error) {
    console.error("Error fetching current session:", error);
    return NextResponse.json(
      { error: "Failed to fetch current session" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "cash_register" });

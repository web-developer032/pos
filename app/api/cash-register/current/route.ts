import { NextResponse } from "next/server";
import { sqlQuery } from "@/lib/db";
import {
  serializeSession,
  SessionRow,
  SESSION_SELECT_SQL,
} from "@/lib/utils/cashRegisterHelpers";

// Disable caching for this route - session state must always be fresh
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/cash-register/current - Get current open session
export async function GET() {
  try {
    const rows = await sqlQuery<SessionRow>(
      `${SESSION_SELECT_SQL} WHERE crs.status = 'open' ORDER BY crs.opened_at DESC LIMIT 1`,
      []
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

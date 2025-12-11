import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import client from "@/lib/db";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";
import {
  serializeSession,
  SessionRow,
  SESSION_SELECT_SQL,
} from "@/lib/utils/cashRegisterHelpers";

const openSessionSchema = z.object({
  opening_balance: z.number().min(0, "Opening balance must be non-negative"),
  user_id: z.number().int().positive("User ID is required"),
  notes: z.string().optional(),
});

// POST /api/cash-register/open - Open a new day session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = openSessionSchema.parse(body);

    // Check if there's already an open session
    const existingSession = await client.execute({
      sql: `SELECT id FROM cash_register_sessions WHERE status = 'open' LIMIT 1`,
      args: [],
    });

    if (existingSession.rows.length > 0) {
      return NextResponse.json(
        { error: "A session is already open. Please close it first." },
        { status: 400 }
      );
    }

    // Create new session with explicit local timestamp (consistent with sales)
    const timestamp = getCurrentTimestamp();
    const result = await client.execute({
      sql: `
        INSERT INTO cash_register_sessions (user_id, opening_balance, status, notes, opened_at)
        VALUES (?, ?, 'open', ?, ?)
      `,
      args: [
        validatedData.user_id,
        validatedData.opening_balance,
        validatedData.notes || null,
        timestamp,
      ],
    });

    // Fetch the created session
    const sessionId = Number(result.lastInsertRowid);
    const sessionResult = await client.execute({
      sql: `${SESSION_SELECT_SQL} WHERE crs.id = ?`,
      args: [sessionId],
    });

    return NextResponse.json({
      message: "Day opened successfully",
      session: serializeSession(sessionResult.rows[0] as unknown as SessionRow),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error opening session:", error);
    return NextResponse.json(
      { error: "Failed to open session" },
      { status: 500 }
    );
  }
}

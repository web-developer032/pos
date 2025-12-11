import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import client from "@/lib/db";

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

    // Create new session
    const result = await client.execute({
      sql: `
        INSERT INTO cash_register_sessions (user_id, opening_balance, status, notes)
        VALUES (?, ?, 'open', ?)
      `,
      args: [
        validatedData.user_id,
        validatedData.opening_balance,
        validatedData.notes || null,
      ],
    });

    // Fetch the created session
    const sessionId = Number(result.lastInsertRowid);
    const sessionResult = await client.execute({
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
        WHERE crs.id = ?
      `,
      args: [sessionId],
    });

    // Convert Row to plain object to avoid BigInt serialization issues
    const sessionRow = sessionResult.rows[0] as unknown as {
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

    const session = {
      id: Number(sessionRow.id),
      user_id: sessionRow.user_id,
      opening_balance: sessionRow.opening_balance,
      closing_balance: sessionRow.closing_balance,
      expected_balance: sessionRow.expected_balance,
      variance: sessionRow.variance,
      status: sessionRow.status,
      opened_at: sessionRow.opened_at,
      closed_at: sessionRow.closed_at,
      notes: sessionRow.notes,
      user_name: sessionRow.user_name,
    };

    return NextResponse.json({
      message: "Day opened successfully",
      session,
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

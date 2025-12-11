import { NextResponse } from "next/server";
import client from "@/lib/db";

// GET /api/cash-register/current - Get current open session
export async function GET() {
  try {
    const result = await client.execute({
      sql: `
        SELECT 
          crs.*,
          u.username as user_name
        FROM cash_register_sessions crs
        LEFT JOIN users u ON crs.user_id = u.id
        WHERE crs.status = 'open'
        ORDER BY crs.opened_at DESC
        LIMIT 1
      `,
      args: [],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ session: null, isOpen: false });
    }

    // Convert Row to plain object to avoid BigInt serialization issues
    const row = result.rows[0] as unknown as {
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
      id: Number(row.id),
      user_id: row.user_id,
      opening_balance: row.opening_balance,
      closing_balance: row.closing_balance,
      expected_balance: row.expected_balance,
      variance: row.variance,
      status: row.status,
      opened_at: row.opened_at,
      closed_at: row.closed_at,
      notes: row.notes,
      user_name: row.user_name,
    };

    return NextResponse.json({
      session,
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

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import client from "@/lib/db";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";
import {
  serializeSession,
  SessionRow,
  SESSION_SELECT_SQL,
} from "@/lib/utils/cashRegisterHelpers";

const closeSessionSchema = z.object({
  closing_balance: z.number().min(0, "Closing balance must be non-negative"),
  notes: z.string().optional(),
});

// POST /api/cash-register/close - Close the current session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = closeSessionSchema.parse(body);

    // Find the open session
    const openSession = await client.execute({
      sql: `SELECT id, opening_balance, opened_at FROM cash_register_sessions WHERE status = 'open' LIMIT 1`,
      args: [],
    });

    if (openSession.rows.length === 0) {
      return NextResponse.json(
        { error: "No open session found to close" },
        { status: 400 }
      );
    }

    const session = openSession.rows[0] as unknown as {
      id: number;
      opening_balance: number;
      opened_at: string;
    };

    const openedAt = session.opened_at;

    // Get cash sales
    const cashSalesResult = await client.execute({
      sql: `SELECT COALESCE(SUM(final_amount), 0) as total FROM sales WHERE payment_method = 'cash' AND created_at >= ?`,
      args: [openedAt],
    });
    const cashSales =
      (cashSalesResult.rows[0] as unknown as { total: number }).total || 0;

    // Get cash refunds
    const cashRefundsResult = await client.execute({
      sql: `SELECT COALESCE(SUM(refund_amount), 0) as total FROM returns WHERE refund_method = 'cash' AND created_at >= ?`,
      args: [openedAt],
    });
    const cashRefunds =
      (cashRefundsResult.rows[0] as unknown as { total: number }).total || 0;

    // Get cash expenses
    const cashExpensesResult = await client.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE payment_method = 'cash' AND created_at >= ?`,
      args: [openedAt],
    });
    const cashExpenses =
      (cashExpensesResult.rows[0] as unknown as { total: number }).total || 0;

    // Calculate expected balance
    const expectedBalance =
      session.opening_balance + cashSales - cashRefunds - cashExpenses;
    const variance = validatedData.closing_balance - expectedBalance;

    // Update the session with explicit local timestamp
    const timestamp = getCurrentTimestamp();
    await client.execute({
      sql: `
        UPDATE cash_register_sessions
        SET closing_balance = ?, expected_balance = ?, variance = ?,
            status = 'closed', closed_at = ?,
            notes = CASE WHEN ? IS NOT NULL THEN ? ELSE notes END
        WHERE id = ?
      `,
      args: [
        validatedData.closing_balance,
        expectedBalance,
        variance,
        timestamp,
        validatedData.notes || null,
        validatedData.notes || null,
        session.id,
      ],
    });

    // Fetch the updated session
    const updatedSessionResult = await client.execute({
      sql: `${SESSION_SELECT_SQL} WHERE crs.id = ?`,
      args: [session.id],
    });

    return NextResponse.json({
      message: "Day closed successfully",
      session: serializeSession(
        updatedSessionResult.rows[0] as unknown as SessionRow
      ),
      summary: {
        opening_balance: session.opening_balance,
        cash_sales: cashSales,
        cash_refunds: cashRefunds,
        cash_expenses: cashExpenses,
        expected_balance: expectedBalance,
        closing_balance: validatedData.closing_balance,
        variance,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error closing session:", error);
    return NextResponse.json(
      { error: "Failed to close session" },
      { status: 500 }
    );
  }
}

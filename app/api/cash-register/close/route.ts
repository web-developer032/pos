import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import client from "@/lib/db";

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
      sql: `SELECT * FROM cash_register_sessions WHERE status = 'open' LIMIT 1`,
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

    // Calculate expected balance based on transactions during the session
    // Cash sales + opening balance - cash refunds - cash expenses
    const openedAt = session.opened_at;

    // Get cash sales (payment_method = 'cash')
    const cashSalesResult = await client.execute({
      sql: `
        SELECT COALESCE(SUM(final_amount), 0) as total
        FROM sales
        WHERE payment_method = 'cash'
        AND created_at >= ?
      `,
      args: [openedAt],
    });
    const cashSales =
      (cashSalesResult.rows[0] as unknown as { total: number }).total || 0;

    // Get cash refunds (refund_method = 'cash')
    const cashRefundsResult = await client.execute({
      sql: `
        SELECT COALESCE(SUM(refund_amount), 0) as total
        FROM returns
        WHERE refund_method = 'cash'
        AND created_at >= ?
      `,
      args: [openedAt],
    });
    const cashRefunds =
      (cashRefundsResult.rows[0] as unknown as { total: number }).total || 0;

    // Get cash expenses (payment_method = 'cash')
    const cashExpensesResult = await client.execute({
      sql: `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM expenses
        WHERE payment_method = 'cash'
        AND created_at >= ?
      `,
      args: [openedAt],
    });
    const cashExpenses =
      (cashExpensesResult.rows[0] as unknown as { total: number }).total || 0;

    // Calculate expected balance
    const expectedBalance =
      session.opening_balance + cashSales - cashRefunds - cashExpenses;
    const variance = validatedData.closing_balance - expectedBalance;

    // Update the session
    await client.execute({
      sql: `
        UPDATE cash_register_sessions
        SET 
          closing_balance = ?,
          expected_balance = ?,
          variance = ?,
          status = 'closed',
          closed_at = CURRENT_TIMESTAMP,
          notes = CASE WHEN ? IS NOT NULL THEN ? ELSE notes END
        WHERE id = ?
      `,
      args: [
        validatedData.closing_balance,
        expectedBalance,
        variance,
        validatedData.notes || null,
        validatedData.notes || null,
        session.id,
      ],
    });

    // Fetch the updated session
    const updatedSessionResult = await client.execute({
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
      args: [session.id],
    });

    // Convert Row to plain object to avoid BigInt serialization issues
    const row = updatedSessionResult.rows[0] as unknown as {
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

    const updatedSession = {
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
      message: "Day closed successfully",
      session: updatedSession,
      summary: {
        opening_balance: session.opening_balance,
        cash_sales: cashSales,
        cash_refunds: cashRefunds,
        cash_expenses: cashExpenses,
        expected_balance: expectedBalance,
        closing_balance: validatedData.closing_balance,
        variance: variance,
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

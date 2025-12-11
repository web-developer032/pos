import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import client from "@/lib/db";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";
import {
  serializeSession,
  SessionRow,
  SESSION_SELECT_SQL,
} from "@/lib/utils/cashRegisterHelpers";

const updateSessionSchema = z.object({
  opening_balance: z.number().min(0).optional(),
  closing_balance: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// GET /api/cash-register/[id] - Get specific session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    // Get session details
    const sessionResult = await client.execute({
      sql: `${SESSION_SELECT_SQL} WHERE crs.id = ?`,
      args: [sessionId],
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const session = serializeSession(
      sessionResult.rows[0] as unknown as SessionRow
    );

    // Use current timestamp if session is still open
    const openedAt = session.opened_at;
    const closedAt = session.closed_at || getCurrentTimestamp();

    // Get sales during this session
    const salesResult = await client.execute({
      sql: `
        SELECT payment_method, COUNT(*) as transaction_count,
               COALESCE(SUM(final_amount), 0) as total_amount
        FROM sales
        WHERE created_at >= ? AND created_at <= ?
        GROUP BY payment_method
      `,
      args: [openedAt, closedAt],
    });

    // Get returns during this session
    const returnsResult = await client.execute({
      sql: `
        SELECT refund_method, COUNT(*) as return_count,
               COALESCE(SUM(refund_amount), 0) as total_refund
        FROM returns
        WHERE created_at >= ? AND created_at <= ?
        GROUP BY refund_method
      `,
      args: [openedAt, closedAt],
    });

    // Get expenses during this session
    const expensesResult = await client.execute({
      sql: `
        SELECT payment_method, category, COUNT(*) as expense_count,
               COALESCE(SUM(amount), 0) as total_amount
        FROM expenses
        WHERE created_at >= ? AND created_at <= ?
        GROUP BY payment_method, category
      `,
      args: [openedAt, closedAt],
    });

    return NextResponse.json({
      session,
      sales: salesResult.rows,
      returns: returnsResult.rows,
      expenses: expensesResult.rows,
    });
  } catch (error) {
    console.error("Error fetching session details:", error);
    return NextResponse.json(
      { error: "Failed to fetch session details" },
      { status: 500 }
    );
  }
}

// PATCH /api/cash-register/[id] - Update session balances
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateSessionSchema.parse(body);

    // Get current session
    const sessionResult = await client.execute({
      sql: `SELECT id, status, opening_balance, opened_at FROM cash_register_sessions WHERE id = ?`,
      args: [sessionId],
    });

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const currentSession = sessionResult.rows[0] as unknown as {
      id: number;
      status: string;
      opening_balance: number;
      opened_at: string;
    };

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const args: (number | string | null)[] = [];

    if (validatedData.opening_balance !== undefined) {
      updates.push("opening_balance = ?");
      args.push(validatedData.opening_balance);
    }

    if (validatedData.closing_balance !== undefined) {
      // Only allow closing_balance update for closed sessions
      if (currentSession.status === "open") {
        return NextResponse.json(
          { error: "Cannot update closing balance for an open session" },
          { status: 400 }
        );
      }
      updates.push("closing_balance = ?");
      args.push(validatedData.closing_balance);
    }

    if (validatedData.notes !== undefined) {
      updates.push("notes = ?");
      args.push(validatedData.notes);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // If opening or closing balance changed, recalculate expected balance and variance
    // for closed sessions
    if (
      currentSession.status === "closed" &&
      (validatedData.opening_balance !== undefined ||
        validatedData.closing_balance !== undefined)
    ) {
      const openingBalance =
        validatedData.opening_balance ?? currentSession.opening_balance;
      const openedAt = currentSession.opened_at;

      // Get cash totals for recalculation
      const cashSalesResult = await client.execute({
        sql: `SELECT COALESCE(SUM(final_amount), 0) as total FROM sales WHERE payment_method = 'cash' AND created_at >= ?`,
        args: [openedAt],
      });
      const cashSales =
        (cashSalesResult.rows[0] as unknown as { total: number }).total || 0;

      const cashRefundsResult = await client.execute({
        sql: `SELECT COALESCE(SUM(refund_amount), 0) as total FROM returns WHERE refund_method = 'cash' AND created_at >= ?`,
        args: [openedAt],
      });
      const cashRefunds =
        (cashRefundsResult.rows[0] as unknown as { total: number }).total || 0;

      const cashExpensesResult = await client.execute({
        sql: `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE payment_method = 'cash' AND created_at >= ?`,
        args: [openedAt],
      });
      const cashExpenses =
        (cashExpensesResult.rows[0] as unknown as { total: number }).total || 0;

      const expectedBalance =
        openingBalance + cashSales - cashRefunds - cashExpenses;

      // Get current or new closing balance
      let closingBalance = validatedData.closing_balance;
      if (closingBalance === undefined) {
        const closingResult = await client.execute({
          sql: `SELECT closing_balance FROM cash_register_sessions WHERE id = ?`,
          args: [sessionId],
        });
        closingBalance = (
          closingResult.rows[0] as unknown as { closing_balance: number }
        ).closing_balance;
      }

      const variance = closingBalance - expectedBalance;

      updates.push("expected_balance = ?");
      args.push(expectedBalance);
      updates.push("variance = ?");
      args.push(variance);
    }

    // Add session ID for WHERE clause
    args.push(sessionId);

    // Execute update
    await client.execute({
      sql: `UPDATE cash_register_sessions SET ${updates.join(", ")} WHERE id = ?`,
      args,
    });

    // Fetch updated session
    const updatedResult = await client.execute({
      sql: `${SESSION_SELECT_SQL} WHERE crs.id = ?`,
      args: [sessionId],
    });

    return NextResponse.json({
      message: "Session updated successfully",
      session: serializeSession(updatedResult.rows[0] as unknown as SessionRow),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

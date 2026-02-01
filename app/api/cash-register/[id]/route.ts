import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, AuthRequest, RouteContext } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { sqlQuery, sqlExecute } from "@/lib/db";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";
import {
  serializeSession,
  SessionRow,
  SESSION_SELECT_SQL,
} from "@/lib/utils/cashRegisterHelpers";

export const dynamic = "force-dynamic";

const updateSessionSchema = z.object({
  opening_balance: z.number().min(0).optional(),
  closing_balance: z.number().min(0).optional(),
  notes: z.string().optional(),
});

async function getHandler(
  req: AuthRequest,
  context?: RouteContext
) {
  try {
    const userId = getCurrentUserId(req);
    const params = await context!.params;
    const { id } = params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    const sessionRows = await sqlQuery(
      `${SESSION_SELECT_SQL} WHERE crs.id = ? AND crs.user_id = ?`,
      [sessionId, userId]
    );

    if (sessionRows.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const session = serializeSession(
      sessionRows[0] as unknown as SessionRow
    );

    const openedAt = session.opened_at;
    const closedAt = session.closed_at || getCurrentTimestamp();

    const salesRows = await sqlQuery(
      `SELECT payment_method, COUNT(*)::bigint as transaction_count,
               COALESCE(SUM(final_amount), 0) as total_amount
        FROM sales
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        GROUP BY payment_method`,
      [userId, openedAt, closedAt]
    );

    const returnsRows = await sqlQuery(
      `SELECT refund_method, COUNT(*)::bigint as return_count,
               COALESCE(SUM(refund_amount), 0) as total_refund
        FROM returns
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        GROUP BY refund_method`,
      [userId, openedAt, closedAt]
    );

    const expensesRows = await sqlQuery(
      `SELECT payment_method, category, COUNT(*)::bigint as expense_count,
               COALESCE(SUM(amount), 0) as total_amount
        FROM expenses
        WHERE user_id = ? AND created_at >= ? AND created_at <= ?
        GROUP BY payment_method, category`,
      [userId, openedAt, closedAt]
    );

    return NextResponse.json({
      session,
      sales: salesRows,
      returns: returnsRows,
      expenses: expensesRows,
    });
  } catch (error) {
    console.error("Error fetching session details:", error);
    return NextResponse.json(
      { error: "Failed to fetch session details" },
      { status: 500 }
    );
  }
}

async function patchHandler(
  req: AuthRequest,
  context?: RouteContext
) {
  try {
    const params = await context!.params;
    const { id } = params;
    const sessionId = parseInt(id);

    if (isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Invalid session ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = updateSessionSchema.parse(body);

    const sessionUserId = getCurrentUserId(req);
    const sessionRows = await sqlQuery(
      `SELECT id, status, opening_balance, opened_at FROM cash_register_sessions WHERE id = ? AND user_id = ?`,
      [sessionId, sessionUserId]
    );

    if (sessionRows.length === 0) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const currentSession = sessionRows[0] as unknown as {
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

      const cashSalesRows = await sqlQuery(
        `SELECT COALESCE(SUM(final_amount), 0) as total FROM sales WHERE payment_method = 'cash' AND created_at >= ?`,
        [openedAt]
      );
      const cashSales = Number((cashSalesRows[0] as Record<string, unknown>)?.total ?? 0);

      const cashRefundsRows = await sqlQuery(
        `SELECT COALESCE(SUM(refund_amount), 0) as total FROM returns WHERE refund_method = 'cash' AND created_at >= ?`,
        [openedAt]
      );
      const cashRefunds = Number((cashRefundsRows[0] as Record<string, unknown>)?.total ?? 0);

      const cashExpensesRows = await sqlQuery(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE payment_method = 'cash' AND created_at >= ?`,
        [openedAt]
      );
      const cashExpenses = Number((cashExpensesRows[0] as Record<string, unknown>)?.total ?? 0);

      const expectedBalance =
        openingBalance + cashSales - cashRefunds - cashExpenses;

      let closingBalance = validatedData.closing_balance;
      if (closingBalance === undefined) {
        const closingRows = await sqlQuery(
          `SELECT closing_balance FROM cash_register_sessions WHERE id = ?`,
          [sessionId]
        );
        closingBalance = (closingRows[0] as Record<string, unknown>)?.closing_balance as number;
      }

      const variance = closingBalance - expectedBalance;

      updates.push("expected_balance = ?");
      args.push(expectedBalance);
      updates.push("variance = ?");
      args.push(variance);
    }

    // Add session ID for WHERE clause
    args.push(sessionId);

    await sqlExecute(
      `UPDATE cash_register_sessions SET ${updates.join(", ")} WHERE id = ?`,
      args
    );

    const updatedRows = await sqlQuery(
      `${SESSION_SELECT_SQL} WHERE crs.id = ?`,
      [sessionId]
    );

    return NextResponse.json({
      message: "Session updated successfully",
      session: serializeSession(updatedRows[0] as unknown as SessionRow),
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

export const GET = requireAuth(getHandler, { requiredFeature: "cash_register" });
export const PATCH = requireAuth(patchHandler, { requiredFeature: "cash_register" });

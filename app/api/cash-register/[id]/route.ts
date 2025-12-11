import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/db";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";
import {
  serializeSession,
  SessionRow,
  SESSION_SELECT_SQL,
} from "@/lib/utils/cashRegisterHelpers";

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

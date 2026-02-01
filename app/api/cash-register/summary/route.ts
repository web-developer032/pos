import { NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { sqlQuery } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PaymentMethodRow {
  payment_method: string;
  total_amount: number;
}

interface RefundMethodRow {
  refund_method: string;
  total_refund: number;
}

// Empty summary response for when no session is open
const EMPTY_SUMMARY = {
  session: null,
  sales: {
    by_method: [],
    total: { transaction_count: 0, total_amount: 0 },
  },
  returns: {
    by_method: [],
    total: { return_count: 0, total_refund: 0 },
  },
  expenses: {
    by_method: [],
    total: { expense_count: 0, total_amount: 0 },
  },
  cash_summary: {
    opening_balance: 0,
    cash_sales: 0,
    cash_refunds: 0,
    cash_expenses: 0,
    expected_balance: 0,
  },
};

async function getHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const openSessionRows = await sqlQuery<{
      id: number;
      opening_balance: number;
      opened_at: string;
    }>(
      `SELECT id, opening_balance, opened_at FROM cash_register_sessions WHERE status = 'open' AND user_id = ? LIMIT 1`,
      [userId]
    );

    if (openSessionRows.length === 0) {
      return NextResponse.json(EMPTY_SUMMARY);
    }

    const session = openSessionRows[0] as {
      id: number;
      opening_balance: number;
      opened_at: string;
    };

    const openedAt = session.opened_at;

    const salesByMethodResult = await sqlQuery<{
      payment_method: string;
      transaction_count: bigint;
      total_amount: number;
      gross_profit: number;
    }>(
      `
        SELECT payment_method, COUNT(*) as transaction_count,
               COALESCE(SUM(final_amount), 0) as total_amount,
               COALESCE(SUM((SELECT SUM((si.unit_price - si.cost_price) * si.quantity) 
                             FROM sale_items si WHERE si.sale_id = sales.id)), 0) as gross_profit
        FROM sales
        WHERE user_id = ? AND created_at >= ?
        GROUP BY payment_method
      `,
      [userId, openedAt]
    );

    const returnedProfitResult = await sqlQuery<{ returned_profit: number }>(
      `
        SELECT COALESCE(SUM((ri.unit_price - si.cost_price) * ri.quantity), 0) as returned_profit
        FROM returns r
        JOIN return_items ri ON r.id = ri.return_id
        JOIN sale_items si ON ri.sale_item_id = si.id
        WHERE r.user_id = ? AND r.created_at >= ?
      `,
      [userId, openedAt]
    );

    const returnedProfit = Number(
      returnedProfitResult[0]?.returned_profit ?? 0
    );

    const totalSalesResult = await sqlQuery<{
      transaction_count: bigint;
      total_amount: number;
    }>(
      `SELECT COUNT(*) as transaction_count, COALESCE(SUM(final_amount), 0) as total_amount
            FROM sales WHERE user_id = ? AND created_at >= ?`,
      [userId, openedAt]
    );

    const returnsByMethodResult = await sqlQuery<{
      refund_method: string;
      return_count: bigint;
      total_refund: number;
    }>(
      `SELECT refund_method, COUNT(*) as return_count, COALESCE(SUM(refund_amount), 0) as total_refund
            FROM returns WHERE user_id = ? AND created_at >= ? GROUP BY refund_method`,
      [userId, openedAt]
    );

    const totalReturnsResult = await sqlQuery<{
      return_count: bigint;
      total_refund: number;
    }>(
      `SELECT COUNT(*) as return_count, COALESCE(SUM(refund_amount), 0) as total_refund
            FROM returns WHERE user_id = ? AND created_at >= ?`,
      [userId, openedAt]
    );

    const expensesByMethodResult = await sqlQuery<{
      payment_method: string;
      category: string;
      expense_count: bigint;
      total_amount: number;
    }>(
      `SELECT payment_method, category, COUNT(*) as expense_count, COALESCE(SUM(amount), 0) as total_amount
            FROM expenses WHERE user_id = ? AND created_at >= ? GROUP BY payment_method, category`,
      [userId, openedAt]
    );

    const totalExpensesResult = await sqlQuery<{
      expense_count: bigint;
      total_amount: number;
    }>(
      `SELECT COUNT(*) as expense_count, COALESCE(SUM(amount), 0) as total_amount
            FROM expenses WHERE user_id = ? AND created_at >= ?`,
      [userId, openedAt]
    );

    const cashSalesRow = salesByMethodResult.find(
      (r) => (r as unknown as PaymentMethodRow).payment_method === "cash"
    ) as unknown as PaymentMethodRow | undefined;
    const cashSales = cashSalesRow?.total_amount || 0;

    const cashRefundsRow = returnsByMethodResult.find(
      (r) => (r as unknown as RefundMethodRow).refund_method === "cash"
    ) as unknown as RefundMethodRow | undefined;
    const cashRefunds = cashRefundsRow?.total_refund || 0;

    const cashExpenses = expensesByMethodResult
      .filter(
        (r) => (r as unknown as PaymentMethodRow).payment_method === "cash"
      )
      .reduce(
        (sum, r) =>
          sum + ((r as unknown as PaymentMethodRow).total_amount || 0),
        0
      );

    const expectedCashBalance =
      session.opening_balance + cashSales - cashRefunds - cashExpenses;

    // Calculate gross profit from all sales
    const grossProfit = salesByMethodResult.reduce(
      (sum, row) =>
        sum + ((row as unknown as { gross_profit: number }).gross_profit || 0),
      0
    );

    // Net profit = gross profit - returned profit
    const netProfit = grossProfit - returnedProfit;

    return NextResponse.json({
      session: {
        id: session.id,
        opening_balance: session.opening_balance,
        opened_at: session.opened_at,
      },
      sales: {
        by_method: salesByMethodResult,
        total: {
          ...totalSalesResult[0],
          gross_profit: grossProfit,
          returned_profit: returnedProfit,
          net_profit: netProfit,
        },
      },
      returns: {
        by_method: returnsByMethodResult,
        total: totalReturnsResult[0],
      },
      expenses: {
        by_method: expensesByMethodResult,
        total: totalExpensesResult[0],
      },
      cash_summary: {
        opening_balance: session.opening_balance,
        cash_sales: cashSales,
        cash_refunds: cashRefunds,
        cash_expenses: cashExpenses,
        expected_balance: expectedCashBalance,
      },
    });
  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "cash_register" });

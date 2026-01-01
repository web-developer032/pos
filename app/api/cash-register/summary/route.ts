import { NextResponse } from "next/server";
import client from "@/lib/db";

// Disable caching for this route - summary must always be fresh
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

// GET /api/cash-register/summary - Get current day summary
export async function GET() {
  try {
    // Find the open session
    const openSession = await client.execute({
      sql: `SELECT id, opening_balance, opened_at FROM cash_register_sessions WHERE status = 'open' LIMIT 1`,
      args: [],
    });

    if (openSession.rows.length === 0) {
      return NextResponse.json(EMPTY_SUMMARY);
    }

    const session = openSession.rows[0] as unknown as {
      id: number;
      opening_balance: number;
      opened_at: string;
    };

    const openedAt = session.opened_at;

    // Get sales by payment method with gross profit
    // Use datetime() to normalize timestamp comparison (handles both old and ISO formats)
    const salesByMethodResult = await client.execute({
      sql: `
        SELECT payment_method, COUNT(*) as transaction_count,
               COALESCE(SUM(final_amount), 0) as total_amount,
               COALESCE(SUM((SELECT SUM((si.unit_price - si.cost_price) * si.quantity) 
                             FROM sale_items si WHERE si.sale_id = sales.id)), 0) as gross_profit
        FROM sales
        WHERE datetime(created_at) >= datetime(?)
        GROUP BY payment_method
      `,
      args: [openedAt],
    });

    // Get returned profit for the session
    const returnedProfitResult = await client.execute({
      sql: `
        SELECT COALESCE(SUM((ri.unit_price - si.cost_price) * ri.quantity), 0) as returned_profit
        FROM returns r
        JOIN return_items ri ON r.id = ri.return_id
        JOIN sale_items si ON ri.sale_item_id = si.id
        WHERE datetime(r.created_at) >= datetime(?)
      `,
      args: [openedAt],
    });

    const returnedProfit =
      (returnedProfitResult.rows[0] as unknown as { returned_profit: number })
        .returned_profit || 0;

    // Get total sales summary
    const totalSalesResult = await client.execute({
      sql: `SELECT COUNT(*) as transaction_count, COALESCE(SUM(final_amount), 0) as total_amount
            FROM sales WHERE datetime(created_at) >= datetime(?)`,
      args: [openedAt],
    });

    // Get returns by refund method
    const returnsByMethodResult = await client.execute({
      sql: `SELECT refund_method, COUNT(*) as return_count, COALESCE(SUM(refund_amount), 0) as total_refund
            FROM returns WHERE datetime(created_at) >= datetime(?) GROUP BY refund_method`,
      args: [openedAt],
    });

    // Get total returns summary
    const totalReturnsResult = await client.execute({
      sql: `SELECT COUNT(*) as return_count, COALESCE(SUM(refund_amount), 0) as total_refund
            FROM returns WHERE datetime(created_at) >= datetime(?)`,
      args: [openedAt],
    });

    // Get expenses by payment method
    const expensesByMethodResult = await client.execute({
      sql: `SELECT payment_method, category, COUNT(*) as expense_count, COALESCE(SUM(amount), 0) as total_amount
            FROM expenses WHERE datetime(created_at) >= datetime(?) GROUP BY payment_method, category`,
      args: [openedAt],
    });

    // Get total expenses summary
    const totalExpensesResult = await client.execute({
      sql: `SELECT COUNT(*) as expense_count, COALESCE(SUM(amount), 0) as total_amount
            FROM expenses WHERE datetime(created_at) >= datetime(?)`,
      args: [openedAt],
    });

    // Calculate cash totals
    const cashSalesRow = salesByMethodResult.rows.find(
      (r) => (r as unknown as PaymentMethodRow).payment_method === "cash"
    ) as unknown as PaymentMethodRow | undefined;
    const cashSales = cashSalesRow?.total_amount || 0;

    const cashRefundsRow = returnsByMethodResult.rows.find(
      (r) => (r as unknown as RefundMethodRow).refund_method === "cash"
    ) as unknown as RefundMethodRow | undefined;
    const cashRefunds = cashRefundsRow?.total_refund || 0;

    const cashExpenses = expensesByMethodResult.rows
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
    const grossProfit = salesByMethodResult.rows.reduce(
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
        by_method: salesByMethodResult.rows,
        total: {
          ...totalSalesResult.rows[0],
          gross_profit: grossProfit,
          returned_profit: returnedProfit,
          net_profit: netProfit,
        },
      },
      returns: {
        by_method: returnsByMethodResult.rows,
        total: totalReturnsResult.rows[0],
      },
      expenses: {
        by_method: expensesByMethodResult.rows,
        total: totalExpensesResult.rows[0],
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

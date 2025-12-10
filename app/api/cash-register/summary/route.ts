import { NextResponse } from "next/server";
import client from "@/lib/db";

// GET /api/cash-register/summary - Get current day summary
export async function GET() {
  try {
    // Find the open session
    const openSession = await client.execute({
      sql: `SELECT * FROM cash_register_sessions WHERE status = 'open' LIMIT 1`,
      args: [],
    });

    if (openSession.rows.length === 0) {
      // Return empty summary instead of error to avoid triggering error toasts
      return NextResponse.json({
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
      });
    }

    const session = openSession.rows[0] as unknown as {
      id: number;
      opening_balance: number;
      opened_at: string;
    };

    const openedAt = session.opened_at;

    // Get sales by payment method
    const salesByMethodResult = await client.execute({
      sql: `
        SELECT 
          payment_method,
          COUNT(*) as transaction_count,
          COALESCE(SUM(final_amount), 0) as total_amount,
          COALESCE(SUM(total_profit), 0) as total_profit
        FROM (
          SELECT 
            s.*,
            COALESCE(
              (SELECT SUM((si.unit_price - si.cost_price) * si.quantity) 
               FROM sale_items si WHERE si.sale_id = s.id), 0
            ) as total_profit
          FROM sales s
          WHERE s.created_at >= ?
        )
        GROUP BY payment_method
      `,
      args: [openedAt],
    });

    // Get total sales summary
    const totalSalesResult = await client.execute({
      sql: `
        SELECT 
          COUNT(*) as transaction_count,
          COALESCE(SUM(final_amount), 0) as total_amount
        FROM sales
        WHERE created_at >= ?
      `,
      args: [openedAt],
    });

    // Get returns by refund method
    const returnsByMethodResult = await client.execute({
      sql: `
        SELECT 
          refund_method,
          COUNT(*) as return_count,
          COALESCE(SUM(refund_amount), 0) as total_refund
        FROM returns
        WHERE created_at >= ?
        GROUP BY refund_method
      `,
      args: [openedAt],
    });

    // Get total returns summary
    const totalReturnsResult = await client.execute({
      sql: `
        SELECT 
          COUNT(*) as return_count,
          COALESCE(SUM(refund_amount), 0) as total_refund
        FROM returns
        WHERE created_at >= ?
      `,
      args: [openedAt],
    });

    // Get expenses by payment method
    const expensesByMethodResult = await client.execute({
      sql: `
        SELECT 
          payment_method,
          category,
          COUNT(*) as expense_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM expenses
        WHERE created_at >= ?
        GROUP BY payment_method, category
      `,
      args: [openedAt],
    });

    // Get total expenses summary
    const totalExpensesResult = await client.execute({
      sql: `
        SELECT 
          COUNT(*) as expense_count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM expenses
        WHERE created_at >= ?
      `,
      args: [openedAt],
    });

    // Calculate expected cash balance
    const cashSales =
      (
        salesByMethodResult.rows.find(
          (r) => (r as { payment_method: string }).payment_method === "cash"
        ) as { total_amount?: number } | undefined
      )?.total_amount || 0;

    const cashRefunds =
      (
        returnsByMethodResult.rows.find(
          (r) => (r as { refund_method: string }).refund_method === "cash"
        ) as { total_refund?: number } | undefined
      )?.total_refund || 0;

    const cashExpenses =
      expensesByMethodResult.rows
        .filter(
          (r) => (r as { payment_method: string }).payment_method === "cash"
        )
        .reduce(
          (sum, r) => sum + ((r as { total_amount: number }).total_amount || 0),
          0
        ) || 0;

    const expectedCashBalance =
      session.opening_balance + cashSales - cashRefunds - cashExpenses;

    return NextResponse.json({
      session: {
        id: session.id,
        opening_balance: session.opening_balance,
        opened_at: session.opened_at,
      },
      sales: {
        by_method: salesByMethodResult.rows,
        total: totalSalesResult.rows[0],
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


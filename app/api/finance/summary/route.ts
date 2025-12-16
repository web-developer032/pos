import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function getHandler() {
  try {
    // Get total capital (investments - withdrawals)
    const capitalResult = await client.execute({
      sql: `
        SELECT 
          SUM(CASE WHEN transaction_type = 'investment' THEN amount ELSE 0 END) as total_investments,
          SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals
        FROM capital
      `,
    });

    const capital = capitalResult.rows[0] as unknown as {
      total_investments: number | null;
      total_withdrawals: number | null;
    };

    const totalCapital =
      (capital.total_investments || 0) - (capital.total_withdrawals || 0);

    // Get total expenses
    const expensesResult = await client.execute({
      sql: "SELECT SUM(amount) as total_expenses FROM expenses",
    });

    const totalExpenses =
      (expensesResult.rows[0] as unknown as { total_expenses: number | null })
        .total_expenses || 0;

    // Get total revenue (total sales amount)
    const revenueResult = await client.execute({
      sql: `
        SELECT COALESCE(SUM(final_amount), 0) as total_revenue
        FROM sales
        WHERE payment_status != 'voided'
      `,
    });

    const totalRevenue =
      (revenueResult.rows[0] as unknown as { total_revenue: number | null })
        .total_revenue || 0;

    // Get total profit from sales (selling price - cost price at time of sale)
    // Uses si.cost_price which is stored when the sale is made, not current product price
    const profitResult = await client.execute({
      sql: `
        SELECT 
          COALESCE(
            SUM((si.unit_price - si.cost_price) * si.quantity)
            -
            COALESCE(
              (SELECT SUM((ri.unit_price - si2.cost_price) * ri.quantity)
               FROM return_items ri
               JOIN returns r ON ri.return_id = r.id
               JOIN sale_items si2 ON ri.sale_item_id = si2.id
               WHERE r.sale_id = s.id),
              0
            ),
            0
          ) as total_profit
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.payment_status != 'voided'
      `,
    });

    const totalProfit =
      (profitResult.rows[0] as unknown as { total_profit: number | null })
        .total_profit || 0;

    // Calculate net balance (capital + profit - expenses)
    const netBalance = totalCapital + totalProfit - totalExpenses;

    return NextResponse.json({
      total_capital: totalCapital,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      total_profit: totalProfit,
      net_balance: netBalance,
    });
  } catch (error) {
    console.error("Error fetching finance summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance summary" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);

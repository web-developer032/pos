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

    // Calculate net balance
    const netBalance = totalCapital - totalExpenses;

    return NextResponse.json({
      total_capital: totalCapital,
      total_expenses: totalExpenses,
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

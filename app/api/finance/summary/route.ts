import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { sqlQuery } from "@/lib/db";

async function getHandler() {
  try {
    const capitalRows = await sqlQuery(
      `SELECT 
          COALESCE(SUM(CASE WHEN transaction_type = 'investment' THEN amount ELSE 0 END), 0) as total_investments,
          COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals
        FROM capital`,
      []
    );

    const capital = capitalRows[0] as unknown as {
      total_investments: number | null;
      total_withdrawals: number | null;
    };

    const totalCapital =
      (capital.total_investments || 0) - (capital.total_withdrawals || 0);

    const expensesRows = await sqlQuery(
      "SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses",
      []
    );

    const totalExpenses = Number((expensesRows[0] as Record<string, unknown>)?.total_expenses ?? 0);

    const revenueRows = await sqlQuery(
      `SELECT COALESCE(SUM(final_amount), 0) as total_revenue
        FROM sales
        WHERE payment_status != 'voided'`,
      []
    );

    const grossRevenue = Number((revenueRows[0] as Record<string, unknown>)?.total_revenue ?? 0);

    const refundsRows = await sqlQuery(
      "SELECT COALESCE(SUM(refund_amount), 0) as total_refunds FROM returns",
      []
    );

    const totalRefunds = Number((refundsRows[0] as Record<string, unknown>)?.total_refunds ?? 0);

    const totalRevenue = grossRevenue - totalRefunds;

    const profitRows = await sqlQuery(
      `SELECT 
          COALESCE(SUM((si.unit_price - si.cost_price) * si.quantity), 0) as gross_profit
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.payment_status != 'voided'`,
      []
    );

    const grossProfit = Number((profitRows[0] as Record<string, unknown>)?.gross_profit ?? 0);

    const returnedProfitRows = await sqlQuery(
      `SELECT 
          COALESCE(SUM((ri.unit_price - si.cost_price) * ri.quantity), 0) as returned_profit
        FROM return_items ri
        JOIN sale_items si ON ri.sale_item_id = si.id`,
      []
    );

    const returnedProfit = Number((returnedProfitRows[0] as Record<string, unknown>)?.returned_profit ?? 0);

    const totalProfit = grossProfit - returnedProfit;

    const otherIncomeRows = await sqlQuery(
      "SELECT COALESCE(SUM(amount), 0) as total_other_income FROM other_income",
      []
    );

    const totalOtherIncome = Number((otherIncomeRows[0] as Record<string, unknown>)?.total_other_income ?? 0);

    const salariesRows = await sqlQuery(
      `SELECT COALESCE(SUM(
          CASE 
            WHEN payment_type = 'deduction' THEN -amount
            ELSE amount
          END
        ), 0) as total_salaries_paid
        FROM salary_payments`,
      []
    );

    const totalSalariesPaid = Number((salariesRows[0] as Record<string, unknown>)?.total_salaries_paid ?? 0);

    // Calculate net balance (capital + profit + other income - expenses - salaries)
    const netBalance =
      totalCapital +
      totalProfit +
      totalOtherIncome -
      totalExpenses -
      totalSalariesPaid;

    return NextResponse.json({
      total_capital: totalCapital,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      total_profit: totalProfit,
      total_other_income: totalOtherIncome,
      total_salaries_paid: totalSalariesPaid,
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

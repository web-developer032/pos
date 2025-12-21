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

    // Get total revenue (total sales amount minus refunds from returns)
    const revenueResult = await client.execute({
      sql: `
        SELECT COALESCE(SUM(final_amount), 0) as total_revenue
        FROM sales
        WHERE payment_status != 'voided'
      `,
    });

    const grossRevenue =
      (revenueResult.rows[0] as unknown as { total_revenue: number | null })
        .total_revenue || 0;

    // Get total refunds from returns
    const refundsResult = await client.execute({
      sql: `SELECT COALESCE(SUM(refund_amount), 0) as total_refunds FROM returns`,
    });

    const totalRefunds =
      (refundsResult.rows[0] as unknown as { total_refunds: number | null })
        .total_refunds || 0;

    const totalRevenue = grossRevenue - totalRefunds;

    // Get total profit from sales (selling price - cost price at time of sale)
    // Uses si.cost_price which is stored when the sale is made, not current product price
    const profitResult = await client.execute({
      sql: `
        SELECT 
          COALESCE(SUM((si.unit_price - si.cost_price) * si.quantity), 0) as gross_profit
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE s.payment_status != 'voided'
      `,
    });

    const grossProfit =
      (profitResult.rows[0] as unknown as { gross_profit: number | null })
        .gross_profit || 0;

    // Get total profit from returned items (to subtract)
    const returnedProfitResult = await client.execute({
      sql: `
        SELECT 
          COALESCE(SUM((ri.unit_price - si.cost_price) * ri.quantity), 0) as returned_profit
        FROM return_items ri
        JOIN sale_items si ON ri.sale_item_id = si.id
      `,
    });

    const returnedProfit =
      (
        returnedProfitResult.rows[0] as unknown as {
          returned_profit: number | null;
        }
      ).returned_profit || 0;

    const totalProfit = grossProfit - returnedProfit;

    // Get total other income
    const otherIncomeResult = await client.execute({
      sql: "SELECT COALESCE(SUM(amount), 0) as total_other_income FROM other_income",
    });

    const totalOtherIncome =
      (
        otherIncomeResult.rows[0] as unknown as {
          total_other_income: number | null;
        }
      ).total_other_income || 0;

    // Get total salaries paid (salaries + bonuses + advances - deductions)
    const salariesResult = await client.execute({
      sql: `
        SELECT COALESCE(SUM(
          CASE 
            WHEN payment_type = 'deduction' THEN -amount
            ELSE amount
          END
        ), 0) as total_salaries_paid
        FROM salary_payments
      `,
    });

    const totalSalariesPaid =
      (
        salariesResult.rows[0] as unknown as {
          total_salaries_paid: number | null;
        }
      ).total_salaries_paid || 0;

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

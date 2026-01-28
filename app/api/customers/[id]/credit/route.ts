import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import { sqlQuery } from "@/lib/db";
import { handleApiError } from "@/lib/utils/apiHelpers";

// GET - Get credit summary for a customer (balance, unpaid sales)
async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const customerId = params.id;

    const customerRows = await sqlQuery(
      "SELECT id, name, phone, credit_balance FROM customers WHERE id = ?",
      [customerId]
    );

    if (customerRows.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customerRows[0] as unknown as {
      id: number;
      name: string;
      phone: string | null;
      credit_balance: number;
    };

    const salesRows = await sqlQuery(
      `SELECT 
          s.id,
          s.sale_number,
          s.final_amount,
          s.payment_status,
          s.payment_method,
          s.created_at,
          COALESCE(SUM(p.amount), 0) as amount_paid,
          (s.final_amount - COALESCE(SUM(p.amount), 0)) as amount_due
        FROM sales s
        LEFT JOIN payments p ON s.id = p.sale_id
        WHERE s.customer_id = ? AND s.payment_status IN ('pending', 'partial')
        GROUP BY s.id
        ORDER BY s.created_at DESC`,
      [customerId]
    );

    const paymentsRows = await sqlQuery(
      `SELECT cp.*, u.username as recorded_by
        FROM customer_payments cp
        LEFT JOIN users u ON cp.user_id = u.id
        WHERE cp.customer_id = ?
        ORDER BY cp.created_at DESC
        LIMIT 10`,
      [customerId]
    );

    const creditStatsRows = await sqlQuery(
      `SELECT 
          COUNT(*)::bigint as total_credit_sales,
          COALESCE(SUM(final_amount), 0) as total_credit_amount
        FROM sales
        WHERE customer_id = ? AND payment_status IN ('pending', 'partial')`,
      [customerId]
    );

    const creditStats = creditStatsRows[0] as unknown as {
      total_credit_sales: number;
      total_credit_amount: number;
    };

    const totalPaymentsRows = await sqlQuery(
      "SELECT COALESCE(SUM(amount), 0) as total_payments FROM customer_payments WHERE customer_id = ?",
      [customerId]
    );
    const totalPayments = Number(
      (totalPaymentsRows[0] as Record<string, unknown>)?.total_payments ?? 0
    );

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        credit_balance: customer.credit_balance,
      },
      unpaid_sales: salesRows,
      recent_payments: paymentsRows,
      summary: {
        total_credit_sales: creditStats.total_credit_sales,
        total_credit_amount: creditStats.total_credit_amount,
        total_payments_received: totalPayments,
        current_balance: customer.credit_balance,
      },
    });
  } catch (error) {
    return handleApiError(error, "fetching customer credit summary");
  }
}

export const GET = requireAuth(getHandler);

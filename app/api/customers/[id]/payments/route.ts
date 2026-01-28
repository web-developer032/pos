import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest, RouteContext } from "@/lib/middleware/auth";
import { sqlQuery, sqlExecute } from "@/lib/db";
import { z } from "zod";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";
import {
  handleApiError,
  handleValidationError,
  getPaginationParams,
  buildPaginationResponse,
} from "@/lib/utils/apiHelpers";

const paymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  payment_method: z.enum(["cash", "card", "bank_transfer", "other"]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

// GET - List payment history for a customer
async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const customerId = params.id;

    const { page, limit, offset } = getPaginationParams(req);

    const countRows = await sqlQuery<{ total: number }>(
      "SELECT COUNT(*)::bigint as total FROM customer_payments WHERE customer_id = ?",
      [customerId]
    );
    const total = Number(countRows[0]?.total ?? 0);

    const rows = await sqlQuery(
      `SELECT cp.*, u.username as recorded_by
        FROM customer_payments cp
        LEFT JOIN users u ON cp.user_id = u.id
        WHERE cp.customer_id = ?
        ORDER BY cp.created_at DESC
        LIMIT ? OFFSET ?`,
      [customerId, limit, offset]
    );

    const totalPaidRows = await sqlQuery(
      "SELECT COALESCE(SUM(amount), 0) as total_paid FROM customer_payments WHERE customer_id = ?",
      [customerId]
    );
    const totalPaid = Number((totalPaidRows[0] as Record<string, unknown>)?.total_paid ?? 0);

    return NextResponse.json({
      payments: rows,
      total_paid: totalPaid,
      pagination: buildPaginationResponse(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error, "fetching customer payments");
  }
}

// POST - Record a new payment against customer's credit balance
async function postHandler(req: AuthRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const customerId = params.id;
    const user = req.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = paymentSchema.parse(body);

    const customerRows = await sqlQuery(
      "SELECT id, name, credit_balance FROM customers WHERE id = ?",
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
      credit_balance: number;
    };

    const timestamp = getCurrentTimestamp();

    const paymentRows = await sqlQuery(
      `INSERT INTO customer_payments (customer_id, amount, payment_method, reference_number, notes, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *`,
      [
        customerId,
        validated.amount,
        validated.payment_method,
        validated.reference_number || null,
        validated.notes || null,
        user.userId,
        timestamp,
      ]
    );

    const newBalance = customer.credit_balance - validated.amount;
    await sqlExecute(
      "UPDATE customers SET credit_balance = ?, updated_at = ? WHERE id = ?",
      [newBalance, timestamp, customerId]
    );

    const message =
      newBalance < 0
        ? `Payment of ${validated.amount} recorded. Customer has credit of ${Math.abs(newBalance)}`
        : newBalance === 0
          ? `Payment of ${validated.amount} recorded. Balance cleared!`
          : `Payment of ${validated.amount} recorded. Remaining balance: ${newBalance}`;

    return NextResponse.json(
      {
        payment: paymentRows[0],
        new_balance: newBalance,
        message,
      },
      { status: 201 }
    );
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "recording customer payment");
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

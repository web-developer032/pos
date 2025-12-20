import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest, RouteContext } from "@/lib/middleware/auth";
import client from "@/lib/db";
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

    // Get total count
    const countResult = await client.execute({
      sql: "SELECT COUNT(*) as total FROM customer_payments WHERE customer_id = ?",
      args: [customerId],
    });
    const total = (countResult.rows[0] as unknown as { total: number }).total;

    // Get payments with pagination
    const result = await client.execute({
      sql: `
        SELECT cp.*, u.username as recorded_by
        FROM customer_payments cp
        LEFT JOIN users u ON cp.user_id = u.id
        WHERE cp.customer_id = ?
        ORDER BY cp.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [customerId, limit, offset],
    });

    // Get total paid amount
    const totalPaidResult = await client.execute({
      sql: "SELECT COALESCE(SUM(amount), 0) as total_paid FROM customer_payments WHERE customer_id = ?",
      args: [customerId],
    });
    const totalPaid = (
      totalPaidResult.rows[0] as unknown as { total_paid: number }
    ).total_paid;

    return NextResponse.json({
      payments: result.rows,
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

    // Check if customer exists and get current balance
    const customerResult = await client.execute({
      sql: "SELECT id, name, credit_balance FROM customers WHERE id = ?",
      args: [customerId],
    });

    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customerResult.rows[0] as unknown as {
      id: number;
      name: string;
      credit_balance: number;
    };

    const timestamp = getCurrentTimestamp();

    // Create payment record
    const paymentResult = await client.execute({
      sql: `
        INSERT INTO customer_payments (customer_id, amount, payment_method, reference_number, notes, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING *
      `,
      args: [
        customerId,
        validated.amount,
        validated.payment_method,
        validated.reference_number || null,
        validated.notes || null,
        user.userId,
        timestamp,
      ],
    });

    // Update customer's credit balance
    const newBalance = customer.credit_balance - validated.amount;
    await client.execute({
      sql: "UPDATE customers SET credit_balance = ?, updated_at = ? WHERE id = ?",
      args: [newBalance, timestamp, customerId],
    });

    const message =
      newBalance < 0
        ? `Payment of ${validated.amount} recorded. Customer has credit of ${Math.abs(newBalance)}`
        : newBalance === 0
          ? `Payment of ${validated.amount} recorded. Balance cleared!`
          : `Payment of ${validated.amount} recorded. Remaining balance: ${newBalance}`;

    return NextResponse.json(
      {
        payment: paymentResult.rows[0],
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

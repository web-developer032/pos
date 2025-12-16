import { NextResponse } from "next/server";
import { requireAuth, AuthRequest, RouteContext } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import { handleApiError, handleValidationError } from "@/lib/utils/apiHelpers";

const updateSchema = z.object({
  amount: z.number().min(0.01).optional(),
  payment_type: z.enum(["salary", "advance", "bonus", "deduction"]).optional(),
  period: z.string().min(1).optional(),
  days_worked: z.number().min(0).optional(),
  payment_method: z.enum(["cash", "bank_transfer", "check", "other"]).optional(),
  notes: z.string().optional(),
});

async function getHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const paymentId = parseInt(id);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await client.execute({
      sql: `
        SELECT sp.*, e.name as employee_name, e.salary_type, u.username as user_name
        FROM salary_payments sp
        JOIN employees e ON sp.employee_id = e.id
        LEFT JOIN users u ON sp.user_id = u.id
        WHERE sp.id = ?
      `,
      args: [paymentId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ payment: result.rows[0] });
  } catch (error) {
    return handleApiError(error, "fetching salary payment");
  }
}

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const paymentId = parseInt(id);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const validated = updateSchema.parse(body);

    // Check if payment exists
    const existingResult = await client.execute({
      sql: "SELECT id FROM salary_payments WHERE id = ?",
      args: [paymentId],
    });

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    if (validated.amount !== undefined) {
      updates.push("amount = ?");
      args.push(validated.amount);
    }
    if (validated.payment_type !== undefined) {
      updates.push("payment_type = ?");
      args.push(validated.payment_type);
    }
    if (validated.period !== undefined) {
      updates.push("period = ?");
      args.push(validated.period);
    }
    if (validated.days_worked !== undefined) {
      updates.push("days_worked = ?");
      args.push(validated.days_worked);
    }
    if (validated.payment_method !== undefined) {
      updates.push("payment_method = ?");
      args.push(validated.payment_method);
    }
    if (validated.notes !== undefined) {
      updates.push("notes = ?");
      args.push(validated.notes || null);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    args.push(paymentId);

    const result = await client.execute({
      sql: `UPDATE salary_payments SET ${updates.join(", ")} WHERE id = ? RETURNING *`,
      args,
    });

    return NextResponse.json({ payment: result.rows[0] });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "updating salary payment");
  }
}

async function deleteHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const paymentId = parseInt(id);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if payment exists
    const existingResult = await client.execute({
      sql: "SELECT id FROM salary_payments WHERE id = ?",
      args: [paymentId],
    });

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    await client.execute({
      sql: "DELETE FROM salary_payments WHERE id = ?",
      args: [paymentId],
    });

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    return handleApiError(error, "deleting salary payment");
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

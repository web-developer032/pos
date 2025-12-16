import { NextResponse } from "next/server";
import { requireAuth, AuthRequest, RouteContext } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import { handleApiError, handleValidationError } from "@/lib/utils/apiHelpers";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  salary_type: z.enum(["monthly", "daily"]).optional(),
  base_salary: z.number().min(0).optional(),
  join_date: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional(),
});

async function getHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Get employee with payment summary
    const result = await client.execute({
      sql: `
        SELECT e.*,
          (SELECT COALESCE(SUM(CASE WHEN payment_type IN ('salary', 'bonus') THEN amount ELSE -amount END), 0)
           FROM salary_payments sp WHERE sp.employee_id = e.id) as total_paid
        FROM employees e
        WHERE e.id = ?
      `,
      args: [employeeId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Get recent payments
    const paymentsResult = await client.execute({
      sql: `
        SELECT sp.*, u.username as user_name
        FROM salary_payments sp
        LEFT JOIN users u ON sp.user_id = u.id
        WHERE sp.employee_id = ?
        ORDER BY sp.created_at DESC
        LIMIT 10
      `,
      args: [employeeId],
    });

    return NextResponse.json({
      employee: result.rows[0],
      recent_payments: paymentsResult.rows,
    });
  } catch (error) {
    return handleApiError(error, "fetching employee");
  }
}

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const validated = updateSchema.parse(body);

    // Check if employee exists
    const existingResult = await client.execute({
      sql: "SELECT id FROM employees WHERE id = ?",
      args: [employeeId],
    });

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates: string[] = ["updated_at = ?"];
    const args: (string | number | null)[] = [getCurrentTimestamp()];

    if (validated.name !== undefined) {
      updates.push("name = ?");
      args.push(validated.name);
    }
    if (validated.phone !== undefined) {
      updates.push("phone = ?");
      args.push(validated.phone || null);
    }
    if (validated.address !== undefined) {
      updates.push("address = ?");
      args.push(validated.address || null);
    }
    if (validated.salary_type !== undefined) {
      updates.push("salary_type = ?");
      args.push(validated.salary_type);
    }
    if (validated.base_salary !== undefined) {
      updates.push("base_salary = ?");
      args.push(validated.base_salary);
    }
    if (validated.join_date !== undefined) {
      updates.push("join_date = ?");
      args.push(validated.join_date || null);
    }
    if (validated.status !== undefined) {
      updates.push("status = ?");
      args.push(validated.status);
    }
    if (validated.notes !== undefined) {
      updates.push("notes = ?");
      args.push(validated.notes || null);
    }

    args.push(employeeId);

    const result = await client.execute({
      sql: `UPDATE employees SET ${updates.join(", ")} WHERE id = ? RETURNING *`,
      args,
    });

    return NextResponse.json({ employee: result.rows[0] });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "updating employee");
  }
}

async function deleteHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if employee exists
    const existingResult = await client.execute({
      sql: "SELECT id FROM employees WHERE id = ?",
      args: [employeeId],
    });

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Check if employee has payments
    const paymentsResult = await client.execute({
      sql: "SELECT COUNT(*) as count FROM salary_payments WHERE employee_id = ?",
      args: [employeeId],
    });
    const paymentCount = (paymentsResult.rows[0] as unknown as { count: number }).count;

    if (paymentCount > 0) {
      // Soft delete by setting status to inactive
      await client.execute({
        sql: "UPDATE employees SET status = 'inactive', updated_at = ? WHERE id = ?",
        args: [getCurrentTimestamp(), employeeId],
      });
      return NextResponse.json({
        message: "Employee deactivated (has payment history)",
      });
    }

    // Hard delete if no payments
    await client.execute({
      sql: "DELETE FROM employees WHERE id = ?",
      args: [employeeId],
    });

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
    return handleApiError(error, "deleting employee");
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

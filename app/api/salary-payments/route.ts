import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import { handleApiError, handleValidationError } from "@/lib/utils/apiHelpers";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";

const salaryPaymentSchema = z.object({
  employee_id: z.number().min(1, "Employee is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_type: z.enum(["salary", "advance", "bonus", "deduction"]),
  period: z.string().min(1, "Period is required"),
  days_worked: z.number().min(0).optional(),
  payment_method: z.enum(["cash", "bank_transfer", "check", "other"]),
  notes: z.string().optional(),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employee_id");
    const period = searchParams.get("period");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let whereClause = " WHERE 1=1";
    const args: (string | number)[] = [];

    if (employeeId) {
      whereClause += " AND sp.employee_id = ?";
      args.push(parseInt(employeeId));
    }
    if (period) {
      whereClause += " AND sp.period = ?";
      args.push(period);
    }
    if (startDate) {
      whereClause += " AND sp.created_at >= ?";
      args.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      whereClause += " AND sp.created_at <= ?";
      args.push(`${endDate} 23:59:59`);
    }
    if (search) {
      whereClause += " AND (e.name LIKE ? OR sp.period LIKE ? OR sp.notes LIKE ?)";
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countResult = await client.execute({
      sql: `SELECT COUNT(*) as total FROM salary_payments sp JOIN employees e ON sp.employee_id = e.id ${whereClause}`,
      args,
    });
    const total = (countResult.rows[0] as unknown as { total: number }).total;

    // Get paginated data
    const sql = `
      SELECT sp.*, e.name as employee_name, e.salary_type, u.username as user_name
      FROM salary_payments sp
      JOIN employees e ON sp.employee_id = e.id
      LEFT JOIN users u ON sp.user_id = u.id
      ${whereClause}
      ORDER BY sp.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const result = await client.execute({
      sql,
      args: [...args, limit, offset],
    });

    // Get summary (for all matching records, not just current page)
    const summarySql = `
      SELECT 
        COALESCE(SUM(CASE WHEN sp.payment_type = 'salary' THEN sp.amount ELSE 0 END), 0) as total_salary,
        COALESCE(SUM(CASE WHEN sp.payment_type = 'advance' THEN sp.amount ELSE 0 END), 0) as total_advance,
        COALESCE(SUM(CASE WHEN sp.payment_type = 'bonus' THEN sp.amount ELSE 0 END), 0) as total_bonus,
        COALESCE(SUM(CASE WHEN sp.payment_type = 'deduction' THEN sp.amount ELSE 0 END), 0) as total_deductions,
        COALESCE(SUM(CASE WHEN sp.payment_type IN ('salary', 'bonus') THEN sp.amount ELSE -sp.amount END), 0) as net_paid
      FROM salary_payments sp
      JOIN employees e ON sp.employee_id = e.id
      ${whereClause}
    `;

    const summaryResult = await client.execute({
      sql: summarySql,
      args,
    });

    return NextResponse.json({
      payments: result.rows,
      summary: summaryResult.rows[0],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, "fetching salary payments");
  }
}

async function postHandler(req: AuthRequest) {
  try {
    const body = await req.json();
    const validated = salaryPaymentSchema.parse(body);
    const user = req.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify employee exists
    const employeeResult = await client.execute({
      sql: "SELECT id, name FROM employees WHERE id = ?",
      args: [validated.employee_id],
    });

    if (employeeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const timestamp = getCurrentTimestamp();

    const result = await client.execute({
      sql: `INSERT INTO salary_payments (employee_id, amount, payment_type, period, days_worked, payment_method, notes, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        validated.employee_id,
        validated.amount,
        validated.payment_type,
        validated.period,
        validated.days_worked || null,
        validated.payment_method,
        validated.notes || null,
        user.userId,
        timestamp,
      ],
    });

    return NextResponse.json({ payment: result.rows[0] }, { status: 201 });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating salary payment");
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

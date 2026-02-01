import { NextResponse } from "next/server";
import { requireAuth, type AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { sqlQuery } from "@/lib/db";
import { z } from "zod";
import { handleApiError, handleValidationError } from "@/lib/utils/apiHelpers";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";

const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  salary_type: z.enum(["monthly", "daily"]),
  base_salary: z.number().min(0, "Base salary must be >= 0"),
  join_date: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional(),
});

async function getHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let sql = `
      SELECT e.*,
        (SELECT COALESCE(SUM(CASE WHEN payment_type IN ('salary', 'bonus') THEN amount ELSE -amount END), 0)
         FROM salary_payments sp WHERE sp.employee_id = e.id) as total_paid
      FROM employees e
      WHERE e.user_id = ?
    `;
    const args: (string | number)[] = [userId];

    if (status) {
      sql += " AND e.status = ?";
      args.push(status);
    }

    if (search) {
      sql += " AND (e.name LIKE ? OR e.phone LIKE ? OR e.address LIKE ?)";
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    sql += " ORDER BY e.name ASC";

    const rows = await sqlQuery(sql, args);

    const summarySql = `
      SELECT 
        COUNT(*)::bigint as total_employees,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)::bigint as active_employees,
        COALESCE(SUM(CASE WHEN salary_type = 'monthly' THEN base_salary ELSE 0 END), 0) as monthly_salary_total,
        COALESCE(SUM(CASE WHEN salary_type = 'daily' THEN base_salary ELSE 0 END), 0) as daily_rate_total
      FROM employees
      WHERE user_id = ?
    `;
    const summaryRows = await sqlQuery(summarySql, [userId]);

    return NextResponse.json({
      employees: rows,
      summary: summaryRows[0],
    });
  } catch (error) {
    return handleApiError(error, "fetching employees");
  }
}

async function postHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const body = await req.json();
    const validated = employeeSchema.parse(body);

    const timestamp = getCurrentTimestamp();

    const rows = await sqlQuery(
      `INSERT INTO employees (user_id, name, phone, address, salary_type, base_salary, join_date, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        userId,
        validated.name,
        validated.phone || null,
        validated.address || null,
        validated.salary_type,
        validated.base_salary,
        validated.join_date || null,
        validated.status || "active",
        validated.notes || null,
        timestamp,
        timestamp,
      ]
    );

    return NextResponse.json({ employee: rows[0] }, { status: 201 });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating employee");
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "employees" });
export const POST = requireAuth(postHandler, { requiredFeature: "employees" });

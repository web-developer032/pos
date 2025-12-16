import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import { handleApiError, handleValidationError } from "@/lib/utils/apiHelpers";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";

const otherIncomeSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  payment_method: z.enum(["cash", "card", "bank_transfer", "other"]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const category = searchParams.get("category");

    let sql = `
      SELECT oi.*, u.username as user_name
      FROM other_income oi
      LEFT JOIN users u ON oi.user_id = u.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (startDate) {
      sql += " AND oi.created_at >= ?";
      args.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      sql += " AND oi.created_at <= ?";
      args.push(`${endDate} 23:59:59`);
    }
    if (category) {
      sql += " AND oi.category = ?";
      args.push(category);
    }

    sql += " ORDER BY oi.created_at DESC";

    const result = await client.execute({ sql, args });

    // Get summary
    let summarySql = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_income,
        category,
        COALESCE(SUM(amount), 0) as category_total
      FROM other_income
      WHERE 1=1
    `;
    const summaryArgs: (string | number)[] = [];

    if (startDate) {
      summarySql += " AND created_at >= ?";
      summaryArgs.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      summarySql += " AND created_at <= ?";
      summaryArgs.push(`${endDate} 23:59:59`);
    }

    summarySql += " GROUP BY category ORDER BY category_total DESC";

    const summaryResult = await client.execute({
      sql: summarySql,
      args: summaryArgs,
    });

    // Get total
    let totalSql = `
      SELECT COALESCE(SUM(amount), 0) as total_income
      FROM other_income
      WHERE 1=1
    `;
    const totalArgs: (string | number)[] = [];

    if (startDate) {
      totalSql += " AND created_at >= ?";
      totalArgs.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      totalSql += " AND created_at <= ?";
      totalArgs.push(`${endDate} 23:59:59`);
    }

    const totalResult = await client.execute({
      sql: totalSql,
      args: totalArgs,
    });
    const totalIncome = (
      totalResult.rows[0] as unknown as { total_income: number }
    ).total_income;

    return NextResponse.json({
      income: result.rows,
      summary: {
        total_income: totalIncome,
        by_category: summaryResult.rows,
      },
    });
  } catch (error) {
    return handleApiError(error, "fetching other income");
  }
}

async function postHandler(req: AuthRequest) {
  try {
    const body = await req.json();
    const validated = otherIncomeSchema.parse(body);
    const user = req.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timestamp = getCurrentTimestamp();

    const result = await client.execute({
      sql: `INSERT INTO other_income (amount, category, description, payment_method, reference_number, notes, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        validated.amount,
        validated.category,
        validated.description || null,
        validated.payment_method,
        validated.reference_number || null,
        validated.notes || null,
        user.userId,
        timestamp,
      ],
    });

    return NextResponse.json({ income: result.rows[0] }, { status: 201 });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating other income");
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

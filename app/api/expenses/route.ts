import { NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { sqlQuery } from "@/lib/db";
import { z } from "zod";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";
import { roundPrice } from "@/lib/utils/apiHelpers";

const expenseSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  payment_method: z.enum(["cash", "card", "bank_transfer", "other"]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

async function getHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const category = searchParams.get("category");

    let sql = `
      SELECT e.*, u.username as user_name
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      WHERE e.user_id = ?
    `;
    const args: (string | number)[] = [userId];

    if (startDate) {
      sql += " AND e.created_at >= ?";
      args.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      sql += " AND e.created_at <= ?";
      args.push(`${endDate}T23:59:59.999Z`);
    }
    if (category) {
      sql += " AND e.category = ?";
      args.push(category);
    }

    sql += " ORDER BY e.created_at DESC";

    const rows = await sqlQuery(sql, args);

    const totalsArgs: (string | number)[] = [userId]; 
    if (startDate) totalsArgs.push(`${startDate}T00:00:00.000Z`); 
    if (endDate) totalsArgs.push(`${endDate}T23:59:59.999Z`);
    let totalsSql = `
      SELECT 
        COALESCE(SUM(amount), 0) as total_expenses,
        category,
        COALESCE(SUM(amount), 0) as category_total
      FROM expenses
      WHERE user_id = ?
    `;
    if (startDate) totalsSql += " AND created_at >= ?";
    if (endDate) totalsSql += " AND created_at <= ?";
    totalsSql += " GROUP BY category";
    const totalsRows = await sqlQuery(totalsSql, totalsArgs);

    const totalExpenses = rows.reduce<number>(
      (sum, row) => sum + Number((row as Record<string, unknown>).amount ?? 0),
      0
    );

    return NextResponse.json({
      expenses: rows,
      summary: {
        total_expenses: totalExpenses,
        by_category: totalsRows,
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

async function postHandler(req: AuthRequest) {
  try {
    const body = await req.json();
    const validated = expenseSchema.parse(body);
    const user = req.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timestamp = getCurrentTimestamp();

    const insertRows = await sqlQuery<{ id: number }>(
      `INSERT INTO expenses (amount, category, description, payment_method, reference_number, notes, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        roundPrice(validated.amount),
        validated.category,
        validated.description || null,
        validated.payment_method,
        validated.reference_number || null,
        validated.notes || null,
        user.userId,
        timestamp,
      ]
    );

    const fullRows = await sqlQuery(
      `SELECT e.*, u.username as user_name
            FROM expenses e
            JOIN users u ON e.user_id = u.id
            WHERE e.id = ?`,
      [insertRows[0].id]
    );

    return NextResponse.json({ expense: fullRows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "finance" });
export const POST = requireAuth(postHandler, { requiredFeature: "finance" });

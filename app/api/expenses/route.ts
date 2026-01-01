import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
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

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const category = searchParams.get("category");

    let sql = `
      SELECT e.*, u.username as user_name
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (startDate) {
      sql += " AND datetime(e.created_at) >= datetime(?)";
      args.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      sql += " AND datetime(e.created_at) <= datetime(?)";
      args.push(`${endDate}T23:59:59.999Z`);
    }
    if (category) {
      sql += " AND e.category = ?";
      args.push(category);
    }

    sql += " ORDER BY e.created_at DESC";

    const result = await client.execute({ sql, args });

    // Calculate totals
    const totalsResult = await client.execute({
      sql: `
        SELECT 
          SUM(amount) as total_expenses,
          category,
          SUM(amount) as category_total
        FROM expenses
        WHERE 1=1
        ${startDate ? "AND created_at >= ?" : ""}
        ${endDate ? "AND created_at <= ?" : ""}
        GROUP BY category
      `,
      args: args.slice(0, startDate || endDate ? 2 : 0),
    });

    const totalExpenses = result.rows.reduce(
      (sum, row) => sum + ((row as unknown as { amount: number }).amount || 0),
      0
    );

    return NextResponse.json({
      expenses: result.rows,
      summary: {
        total_expenses: totalExpenses,
        by_category: totalsResult.rows,
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

    const result = await client.execute({
      sql: `INSERT INTO expenses (amount, category, description, payment_method, reference_number, notes, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        roundPrice(validated.amount),
        validated.category,
        validated.description || null,
        validated.payment_method,
        validated.reference_number || null,
        validated.notes || null,
        user.userId,
        timestamp,
      ],
    });

    // Get full record with user name
    const fullResult = await client.execute({
      sql: `SELECT e.*, u.username as user_name
            FROM expenses e
            JOIN users u ON e.user_id = u.id
            WHERE e.id = ?`,
      args: [(result.rows[0] as unknown as { id: number }).id],
    });

    return NextResponse.json({ expense: fullResult.rows[0] }, { status: 201 });
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

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";
import { roundPrice } from "@/lib/utils/apiHelpers";

const capitalSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  transaction_type: z.enum(["investment", "withdrawal"]),
  notes: z.string().optional(),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    let sql = `
      SELECT c.*, u.username as user_name
      FROM capital c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (startDate) {
      sql += " AND c.created_at >= ?";
      args.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      sql += " AND c.created_at <= ?";
      args.push(`${endDate}T23:59:59.999Z`);
    }

    sql += " ORDER BY c.created_at DESC";

    const result = await client.execute({ sql, args });

    // Calculate totals
    const totalsResult = await client.execute({
      sql: `
        SELECT 
          SUM(CASE WHEN transaction_type = 'investment' THEN amount ELSE 0 END) as total_investments,
          SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END) as total_withdrawals
        FROM capital
        WHERE 1=1
        ${startDate ? "AND created_at >= ?" : ""}
        ${endDate ? "AND created_at <= ?" : ""}
      `,
      args: args,
    });

    const totals = totalsResult.rows[0] as unknown as {
      total_investments: number | null;
      total_withdrawals: number | null;
    };

    return NextResponse.json({
      capital: result.rows,
      summary: {
        total_investments: totals.total_investments || 0,
        total_withdrawals: totals.total_withdrawals || 0,
        net_capital:
          (totals.total_investments || 0) - (totals.total_withdrawals || 0),
      },
    });
  } catch (error) {
    console.error("Error fetching capital:", error);
    return NextResponse.json(
      { error: "Failed to fetch capital records" },
      { status: 500 }
    );
  }
}

async function postHandler(req: AuthRequest) {
  try {
    const body = await req.json();
    const validated = capitalSchema.parse(body);
    const user = req.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timestamp = getCurrentTimestamp();

    const result = await client.execute({
      sql: `INSERT INTO capital (amount, description, transaction_type, notes, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        roundPrice(validated.amount),
        validated.description || null,
        validated.transaction_type,
        validated.notes || null,
        user.userId,
        timestamp,
      ],
    });

    // Get full record with user name
    const fullResult = await client.execute({
      sql: `SELECT c.*, u.username as user_name
            FROM capital c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?`,
      args: [(result.rows[0] as unknown as { id: number }).id],
    });

    return NextResponse.json({ capital: fullResult.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating capital record:", error);
    return NextResponse.json(
      { error: "Failed to create capital record" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

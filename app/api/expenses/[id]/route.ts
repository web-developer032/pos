import { NextResponse } from "next/server";
import { requireAuth, RouteContext, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const updateExpenseSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  payment_method: z.enum(["cash", "card", "bank_transfer", "other"]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

async function getHandler(req: Request, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = parseInt(params.id);

    const result = await client.execute({
      sql: `SELECT e.*, u.username as user_name
            FROM expenses e
            JOIN users u ON e.user_id = u.id
            WHERE e.id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ expense: result.rows[0] });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await req.json();
    const validated = updateExpenseSchema.parse(body);

    // Verify record exists
    const checkResult = await client.execute({
      sql: "SELECT id FROM expenses WHERE id = ?",
      args: [id],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    // Update record
    await client.execute({
      sql: `UPDATE expenses 
            SET amount = ?, category = ?, description = ?, payment_method = ?, 
                reference_number = ?, notes = ?
            WHERE id = ?`,
      args: [
        validated.amount,
        validated.category,
        validated.description || null,
        validated.payment_method,
        validated.reference_number || null,
        validated.notes || null,
        id,
      ],
    });

    // Get updated record
    const result = await client.execute({
      sql: `SELECT e.*, u.username as user_name
            FROM expenses e
            JOIN users u ON e.user_id = u.id
            WHERE e.id = ?`,
      args: [id],
    });

    return NextResponse.json({ expense: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: Request, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = parseInt(params.id);

    // Verify record exists
    const checkResult = await client.execute({
      sql: "SELECT id FROM expenses WHERE id = ?",
      args: [id],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    // Delete record
    await client.execute({
      sql: "DELETE FROM expenses WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);


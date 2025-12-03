import { NextResponse } from "next/server";
import { requireAuth, RouteContext, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const updateCapitalSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  transaction_type: z.enum(["investment", "withdrawal"]),
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
      sql: `SELECT c.*, u.username as user_name
            FROM capital c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Capital record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ capital: result.rows[0] });
  } catch (error) {
    console.error("Error fetching capital record:", error);
    return NextResponse.json(
      { error: "Failed to fetch capital record" },
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
    const validated = updateCapitalSchema.parse(body);

    // Verify record exists
    const checkResult = await client.execute({
      sql: "SELECT id FROM capital WHERE id = ?",
      args: [id],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Capital record not found" },
        { status: 404 }
      );
    }

    // Update record
    await client.execute({
      sql: `UPDATE capital 
            SET amount = ?, description = ?, transaction_type = ?, notes = ?
            WHERE id = ?`,
      args: [
        validated.amount,
        validated.description || null,
        validated.transaction_type,
        validated.notes || null,
        id,
      ],
    });

    // Get updated record
    const result = await client.execute({
      sql: `SELECT c.*, u.username as user_name
            FROM capital c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?`,
      args: [id],
    });

    return NextResponse.json({ capital: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating capital record:", error);
    return NextResponse.json(
      { error: "Failed to update capital record" },
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
      sql: "SELECT id FROM capital WHERE id = ?",
      args: [id],
    });

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Capital record not found" },
        { status: 404 }
      );
    }

    // Delete record
    await client.execute({
      sql: "DELETE FROM capital WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ message: "Capital record deleted successfully" });
  } catch (error) {
    console.error("Error deleting capital record:", error);
    return NextResponse.json(
      { error: "Failed to delete capital record" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);


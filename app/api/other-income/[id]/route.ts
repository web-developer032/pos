import { NextResponse } from "next/server";
import { requireAuth, AuthRequest, RouteContext } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import { handleApiError, handleValidationError } from "@/lib/utils/apiHelpers";

const updateSchema = z.object({
  amount: z.number().min(0.01).optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  payment_method: z.enum(["cash", "card", "bank_transfer", "other"]).optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

async function getHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const incomeId = parseInt(id);

    if (isNaN(incomeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const result = await client.execute({
      sql: `
        SELECT oi.*, u.username as user_name
        FROM other_income oi
        LEFT JOIN users u ON oi.user_id = u.id
        WHERE oi.id = ?
      `,
      args: [incomeId],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Other income record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ income: result.rows[0] });
  } catch (error) {
    return handleApiError(error, "fetching other income");
  }
}

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const incomeId = parseInt(id);

    if (isNaN(incomeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const validated = updateSchema.parse(body);

    // Check if record exists
    const existingResult = await client.execute({
      sql: "SELECT id FROM other_income WHERE id = ?",
      args: [incomeId],
    });

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Other income record not found" },
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
    if (validated.category !== undefined) {
      updates.push("category = ?");
      args.push(validated.category);
    }
    if (validated.description !== undefined) {
      updates.push("description = ?");
      args.push(validated.description || null);
    }
    if (validated.payment_method !== undefined) {
      updates.push("payment_method = ?");
      args.push(validated.payment_method);
    }
    if (validated.reference_number !== undefined) {
      updates.push("reference_number = ?");
      args.push(validated.reference_number || null);
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

    args.push(incomeId);

    const result = await client.execute({
      sql: `UPDATE other_income SET ${updates.join(", ")} WHERE id = ? RETURNING *`,
      args,
    });

    return NextResponse.json({ income: result.rows[0] });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "updating other income");
  }
}

async function deleteHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const incomeId = parseInt(id);

    if (isNaN(incomeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if record exists
    const existingResult = await client.execute({
      sql: "SELECT id FROM other_income WHERE id = ?",
      args: [incomeId],
    });

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Other income record not found" },
        { status: 404 }
      );
    }

    await client.execute({
      sql: "DELETE FROM other_income WHERE id = ?",
      args: [incomeId],
    });

    return NextResponse.json({ message: "Other income deleted successfully" });
  } catch (error) {
    return handleApiError(error, "deleting other income");
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

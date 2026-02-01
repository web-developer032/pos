import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext, type AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { sqlQuery, sqlExecute } from "@/lib/db";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

async function getHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const userId = getCurrentUserId(req);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const rows = await sqlQuery("SELECT * FROM categories WHERE id = ? AND user_id = ?", [params.id, userId]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ category: rows[0] });
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const userId = getCurrentUserId(req);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const body = await req.json();
    const validated = categorySchema.parse(body);

    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (validated.name !== undefined) {
      updates.push("name = ?");
      values.push(validated.name);
    }
    if (validated.description !== undefined) {
      updates.push("description = ?");
      values.push(validated.description);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(params.id, String(userId));

    const rows = await sqlQuery(
      `UPDATE categories SET ${updates.join(", ")} WHERE id = ? AND user_id = ? RETURNING *`,
      values
    );

    return NextResponse.json({ category: rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const userId = getCurrentUserId(req);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    await sqlExecute("DELETE FROM categories WHERE id = ? AND user_id = ?", [params.id, userId]);

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "categories" });
export const PUT = requireAuth(putHandler, { requiredFeature: "categories" });
export const DELETE = requireAuth(deleteHandler, { requiredFeature: "categories" });

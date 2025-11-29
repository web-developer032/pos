import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { z } from "zod";
import client from "@/lib/db";
import {
  getPaginationParams,
  executePaginatedQuery,
  handleApiError,
  handleValidationError,
} from "@/lib/utils/apiHelpers";

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

async function getHandler(req: NextRequest) {
  try {
    const { page, limit, offset } = getPaginationParams(req);

    const result = await executePaginatedQuery({
      baseSql: "SELECT * FROM categories WHERE 1=1",
      baseArgs: [],
      orderBy: "name",
      page,
      limit,
      offset,
    });

    return NextResponse.json({
      categories: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleApiError(error, "fetching categories");
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = categorySchema.parse(body);

    const result = await client.execute({
      sql: "INSERT INTO categories (name, description) VALUES (?, ?) RETURNING *",
      args: [validated.name, validated.description || null],
    });

    return NextResponse.json({ category: result.rows[0] }, { status: 201 });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating category");
  }
}

async function deleteHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      await client.execute("DELETE FROM categories");
      return NextResponse.json({
        message: "All categories deleted successfully",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "deleting categories");
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);

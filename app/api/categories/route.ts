import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

async function getHandler() {
  try {
    const result = await client.execute(
      "SELECT * FROM categories ORDER BY name"
    );
    return NextResponse.json({ categories: result.rows });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

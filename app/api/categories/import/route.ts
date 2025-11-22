import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const importSchema = z.object({
  categories: z.array(categorySchema),
});

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = importSchema.parse(body);

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < validated.categories.length; i++) {
      const category = validated.categories[i];
      try {
        await client.execute({
          sql: "INSERT INTO categories (name, description) VALUES (?, ?)",
          args: [category.name, category.description || null],
        });
        imported++;
      } catch (error: any) {
        errors.push(`Row ${i + 1} (${category.name}): ${error.message || "Failed to import"}`);
      }
    }

    return NextResponse.json({
      message: `Imported ${imported} of ${validated.categories.length} categories`,
      imported,
      errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error importing categories:", error);
    return NextResponse.json(
      { error: "Failed to import categories" },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(postHandler);


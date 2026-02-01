import { NextResponse } from "next/server";
import { requireAuth, type AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { sqlExecute } from "@/lib/db";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const importSchema = z.object({
  categories: z.array(categorySchema),
});

async function postHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const body = await req.json();
    const validated = importSchema.parse(body);

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < validated.categories.length; i++) {
      const category = validated.categories[i];
      try {
        await sqlExecute(
          "INSERT INTO categories (user_id, name, description) VALUES (?, ?, ?)",
          [userId, category.name, category.description || null]
        );
        imported++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to import";
        errors.push(`Row ${i + 1} (${category.name}): ${errorMessage}`);
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

export const POST = requireAuth(postHandler, { requiredFeature: "categories" });

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { sqlQuery, sqlExecute } from "@/lib/db";
import { z } from "zod";
import { roundPrice } from "@/lib/utils/apiHelpers";

// Helper to normalize empty/whitespace strings to undefined
const normalizeEmptyString = (val: unknown): string | undefined => {
  if (val === null || val === undefined) return undefined;
  const str = String(val).trim();
  return str.length > 0 ? str : undefined;
};

const productSchema = z.object({
  name: z.string().min(1),
  barcode: z.preprocess(normalizeEmptyString, z.string().optional()),
  sku: z.preprocess(normalizeEmptyString, z.string().optional()),
  description: z.preprocess(normalizeEmptyString, z.string().optional()),
  category_id: z.preprocess(
    (val) =>
      val === "" || val === null || val === undefined ? undefined : Number(val),
    z.number().optional()
  ),
  cost_price: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return 0;
    // Remove commas from string before parsing
    const cleaned = String(val).replace(/,/g, "").trim();
    return cleaned === "" ? 0 : Number(cleaned);
  }, z.number().min(0)),
  selling_price: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return 0;
    // Remove commas from string before parsing
    const cleaned = String(val).replace(/,/g, "").trim();
    return cleaned === "" ? 0 : Number(cleaned);
  }, z.number().min(0)),
  stock_quantity: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return 0;
    // Remove commas from string before parsing
    const cleaned = String(val).replace(/,/g, "").trim();
    return cleaned === "" ? 0 : Number(cleaned);
  }, z.number().min(0).optional().default(0)),
  min_stock_level: z.preprocess((val) => {
    if (val === "" || val === null || val === undefined) return 0;
    // Remove commas from string before parsing
    const cleaned = String(val).replace(/,/g, "").trim();
    return cleaned === "" ? 0 : Number(cleaned);
  }, z.number().min(0).optional().default(0)),
  unit: z.preprocess(
    (val) => {
      const str = String(val || "")
        .trim()
        .toLowerCase();
      const validUnits = ["piece", "gram", "kilogram", "liter", "milliliter"];
      return validUnits.includes(str) ? str : "piece";
    },
    z
      .enum(["piece", "gram", "kilogram", "liter", "milliliter"])
      .default("piece")
  ),
  image_url: z.preprocess(normalizeEmptyString, z.string().optional()),
});

const importSchema = z.object({
  products: z.array(productSchema),
});

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = importSchema.parse(body);

    // Get "Other" category ID (create if it doesn't exist)
    let otherCategoryId: number | null = null;

    try {
      const categoryRows = await sqlQuery(
        "SELECT id FROM categories WHERE name = ?",
        ["Other"]
      );
      if (categoryRows.length > 0) {
        otherCategoryId = (categoryRows[0] as Record<string, unknown>).id as number;
      } else {
        await sqlExecute(
          "INSERT INTO categories (name, description) VALUES (?, ?)",
          ["Other", "Default category for uncategorized items"]
        );
        const newCategoryRows = await sqlQuery(
          "SELECT id FROM categories WHERE name = ?",
          ["Other"]
        );
        otherCategoryId = (newCategoryRows[0] as Record<string, unknown>)?.id as number;
      }
    } catch (error) {
      console.warn("Error getting/creating Other category:", error);
    }

    // Clean up any existing products with empty string barcodes/skus (convert to NULL)
    // This must run before importing to prevent UNIQUE constraint violations
    try {
      await sqlExecute(
        "UPDATE products SET barcode = NULL WHERE barcode = '' OR barcode IS NULL",
        []
      );
      await sqlExecute(
        "UPDATE products SET sku = NULL WHERE sku = '' OR sku IS NULL",
        []
      );
    } catch (cleanupError) {
      console.warn("Cleanup warning (non-fatal):", cleanupError);
    }

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < validated.products.length; i++) {
      const product = validated.products[i];
      try {
        // Ensure barcode and sku are NULL (not empty string) for database insertion
        const barcode =
          product.barcode && product.barcode.trim().length > 0
            ? product.barcode.trim()
            : null;
        const sku =
          product.sku && product.sku.trim().length > 0
            ? product.sku.trim()
            : null;
        const description =
          product.description && product.description.trim().length > 0
            ? product.description.trim()
            : null;
        const imageUrl =
          product.image_url && product.image_url.trim().length > 0
            ? product.image_url.trim()
            : null;

        // Use "Other" category if not provided
        let categoryId = product.category_id || null;

        if (categoryId) {
          const categoryRows = await sqlQuery(
            "SELECT id FROM categories WHERE id = ?",
            [categoryId]
          );
          if (categoryRows.length === 0) {
            categoryId = otherCategoryId;
          }
        } else {
          categoryId = otherCategoryId;
        }

        await sqlExecute(
          `INSERT INTO products (name, barcode, sku, description, category_id, 
                cost_price, selling_price, stock_quantity, min_stock_level, unit, image_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            product.name.trim(),
            barcode,
            sku,
            description,
            categoryId,
            roundPrice(product.cost_price),
            roundPrice(product.selling_price),
            product.stock_quantity || 0,
            product.min_stock_level || 0,
            product.unit || "piece",
            imageUrl,
          ]
        );
        imported++;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to import";
        errors.push(`Row ${i + 2} (${product.name}): ${errorMessage}`);
      }
    }

    return NextResponse.json({
      message: `Imported ${imported} of ${validated.products.length} products`,
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
    console.error("Error importing products:", error);
    return NextResponse.json(
      { error: "Failed to import products" },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(postHandler);

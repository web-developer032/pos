import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  category_id: z.number().optional(),
  supplier_id: z.number().optional(),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0),
  stock_quantity: z.number().int().min(0),
  min_stock_level: z.number().int().min(0),
  image_url: z.string().optional(),
});

const importSchema = z.object({
  products: z.array(productSchema),
});

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = importSchema.parse(body);

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < validated.products.length; i++) {
      const product = validated.products[i];
      try {
        await client.execute({
          sql: `INSERT INTO products (name, barcode, sku, description, category_id, supplier_id, 
                cost_price, selling_price, stock_quantity, min_stock_level, image_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            product.name,
            product.barcode || null,
            product.sku || null,
            product.description || null,
            product.category_id || null,
            product.supplier_id || null,
            product.cost_price,
            product.selling_price,
            product.stock_quantity,
            product.min_stock_level,
            product.image_url || null,
          ],
        });
        imported++;
      } catch (error: any) {
        errors.push(`Row ${i + 1} (${product.name}): ${error.message || "Failed to import"}`);
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
        { error: "Invalid input", details: error.errors },
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


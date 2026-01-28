import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import { sqlQuery, sqlExecute } from "@/lib/db";
import { z } from "zod";
import { roundPrice } from "@/lib/utils/apiHelpers";

const productUnitEnum = z.enum([
  "piece",
  "gram",
  "kilogram",
  "liter",
  "milliliter",
]);

const productSchema = z
  .object({
    name: z.string().min(1).optional(),
    barcode: z.string().optional(),
    additional_barcodes: z.array(z.string()).optional(),
    sku: z.string().optional(),
    description: z.string().optional(),
    category_id: z.number().optional(),
    cost_price: z.number().min(0).optional(),
    selling_price: z.number().min(0).optional(),
    stock_quantity: z.number().optional(), // Allow negative (can happen due to sales)
    min_stock_level: z.number().min(0).optional(),
    unit: productUnitEnum.optional(),
    image_url: z.string().optional(),
    base_product_id: z.number().nullable().optional(),
    quantity_multiplier: z.number().nullable().optional(),
  })
  .refine(
    (data) => {
      // If base_product_id is set, quantity_multiplier must be > 0
      if (data.base_product_id !== undefined && data.base_product_id !== null) {
        if (
          data.quantity_multiplier === undefined ||
          data.quantity_multiplier === null ||
          data.quantity_multiplier <= 0
        ) {
          return false;
        }
      }
      // If base_product_id is not set, quantity_multiplier should not be set
      if (data.base_product_id === undefined || data.base_product_id === null) {
        if (
          data.quantity_multiplier !== undefined &&
          data.quantity_multiplier !== null
        ) {
          return false;
        }
      }
      return true;
    },
    {
      message:
        "If base_product_id is set, quantity_multiplier must be > 0. If base_product_id is not set, quantity_multiplier should not be set.",
    }
  );

async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const rows = await sqlQuery(
      `SELECT p.*, c.name as category_name,
                   bp.stock_quantity as base_product_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN products bp ON p.base_product_id = bp.id
            WHERE p.id = ? AND p.deleted_at IS NULL`,
      [params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const barcodeRows = await sqlQuery<{ barcode: string }>(
      "SELECT barcode FROM product_barcodes WHERE product_id = ?",
      [params.id]
    );

    const additionalBarcodes = barcodeRows.map((r) => r.barcode);

    const product = rows[0] as unknown as Record<string, unknown>;
    product.additional_barcodes = additionalBarcodes;

    const subProductsRows = await sqlQuery(
      `SELECT id, name, barcode, quantity_multiplier, cost_price, selling_price, unit
            FROM products 
            WHERE base_product_id = ? AND deleted_at IS NULL
            ORDER BY name`,
      [params.id]
    );

    const subProducts = subProductsRows.map((row) => row as unknown as {
      id: number;
      name: string;
      barcode: string | null;
      quantity_multiplier: number;
      cost_price: number;
      selling_price: number;
      unit: string;
    });

    return NextResponse.json({ product, sub_products: subProducts });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

async function putHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const body = await req.json();
    const validated = productSchema.parse(body);

    // Additional validation: Check if base_product_id exists (for related products)
    if (
      validated.base_product_id !== undefined &&
      validated.base_product_id !== null
    ) {
      const baseProductRows = await sqlQuery(
        "SELECT id, sku, base_product_id FROM products WHERE id = ? AND deleted_at IS NULL",
        [validated.base_product_id]
      );
      if (baseProductRows.length === 0) {
        return NextResponse.json(
          { error: "Base product not found" },
          { status: 400 }
        );
      }
      const baseProductData = baseProductRows[0] as unknown as {
        id: number;
        sku: string | null;
        base_product_id: number | null;
      };
      // Prevent nested relationships - base product cannot itself be a related product
      if (baseProductData.base_product_id !== null) {
        return NextResponse.json(
          { error: "Base product cannot be a related product itself" },
          { status: 400 }
        );
      }
      // For related products, use the base product's SKU if not provided
      if (!validated.sku && baseProductData.sku) {
        validated.sku = baseProductData.sku;
      }
      // Related products should have stock_quantity = 0 (they use base product's stock)
      if (validated.stock_quantity !== undefined) {
        validated.stock_quantity = 0;
      }
      if (validated.min_stock_level !== undefined) {
        validated.min_stock_level = 0;
      }
    }

    const updates: string[] = [];
    const values: (string | number | null | boolean)[] = [];
    const additionalBarcodes = validated.additional_barcodes;

    // Handle additional_barcodes separately - exclude it from product updates
    Object.entries(validated).forEach(([key, value]) => {
      if (key !== "additional_barcodes" && value !== undefined) {
        updates.push(`${key} = ?`);
        // Round price fields to 2 decimals
        if (key === "cost_price" || key === "selling_price") {
          values.push(roundPrice(value as number));
        } else {
          // Type assertion needed because we've filtered out additional_barcodes
          values.push(value as string | number | null);
        }
      }
    });

    if (updates.length === 0 && !additionalBarcodes) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(params.id);

      await sqlExecute(
        `UPDATE products SET ${updates.join(", ")} WHERE id = ?`,
        values
      );
    }

    if (additionalBarcodes !== undefined) {
      await sqlExecute(
        "DELETE FROM product_barcodes WHERE product_id = ?",
        [params.id]
      );

      if (additionalBarcodes.length > 0) {
        for (const barcode of additionalBarcodes) {
          if (barcode?.trim()) {
            try {
              await sqlExecute(
                "INSERT INTO product_barcodes (product_id, barcode) VALUES (?, ?)",
                [params.id, barcode.trim()]
              );
            } catch (error) {
              console.warn(`Failed to add barcode ${barcode}:`, error);
            }
          }
        }
      }
    }

    const resultRows = await sqlQuery(
      `SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.deleted_at IS NULL`,
      [params.id]
    );

    if (resultRows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const barcodeRows = await sqlQuery<{ barcode: string }>(
      "SELECT barcode FROM product_barcodes WHERE product_id = ?",
      [params.id]
    );

    const fetchedBarcodes = barcodeRows.map((r) => r.barcode);

    const product = resultRows[0] as unknown as Record<string, unknown>;
    product.additional_barcodes = fetchedBarcodes;

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;

    const productRows = await sqlQuery(
      "SELECT id, name FROM products WHERE id = ?",
      [params.id]
    );

    if (productRows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await sqlExecute(
      "UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?",
      [params.id]
    );

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

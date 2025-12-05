import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import { roundPrice } from "@/lib/utils/apiHelpers";

const productUnitEnum = z.enum([
  "piece",
  "gram",
  "kilogram",
  "liter",
  "milliliter",
]);

const productTypeEnum = z.enum(["simple", "base", "packing", "composite"]);

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
    stock_quantity: z.number().min(0).optional(),
    min_stock_level: z.number().min(0).optional(),
    unit: productUnitEnum.optional(),
    image_url: z.string().optional(),
    product_type: productTypeEnum.optional(),
    base_product_id: z.number().nullable().optional(),
    base_unit_quantity: z.number().nullable().optional(),
    composite_product_id: z.number().nullable().optional(),
    composite_quantity: z.number().nullable().optional(),
    is_variable_quantity: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Validation based on product_type
      if (data.product_type === "packing") {
        // Packings must have base_product_id and base_unit_quantity
        if (
          data.base_product_id === null ||
          data.base_unit_quantity === null ||
          (data.base_unit_quantity !== undefined &&
            data.base_unit_quantity <= 0)
        ) {
          return false;
        }
        // Packings cannot have composite fields
        if (
          data.composite_product_id !== null ||
          data.composite_quantity !== null
        ) {
          return false;
        }
        // Packings cannot have is_variable_quantity
        if (data.is_variable_quantity === true) {
          return false;
        }
      } else if (data.product_type === "composite") {
        // Composites must have composite_product_id and composite_quantity
        if (
          data.composite_product_id === null ||
          data.composite_quantity === null ||
          (data.composite_quantity !== undefined &&
            data.composite_quantity <= 0)
        ) {
          return false;
        }
        // Composites cannot have base fields
        if (data.base_product_id !== null || data.base_unit_quantity !== null) {
          return false;
        }
        // Composites cannot have is_variable_quantity
        if (data.is_variable_quantity === true) {
          return false;
        }
      } else if (data.product_type === "base") {
        // Base products cannot have relationship fields
        if (data.base_product_id !== null || data.base_unit_quantity !== null) {
          return false;
        }
        if (
          data.composite_product_id !== null ||
          data.composite_quantity !== null
        ) {
          return false;
        }
      } else if (data.product_type === "simple" || !data.product_type) {
        // Simple products cannot have any relationship fields
        if (data.base_product_id !== null || data.base_unit_quantity !== null) {
          return false;
        }
        if (
          data.composite_product_id !== null ||
          data.composite_quantity !== null
        ) {
          return false;
        }
        if (data.is_variable_quantity === true) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Invalid product relationship configuration",
    }
  );

async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const result = await client.execute({
      sql: `SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.deleted_at IS NULL`,
      args: [params.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch additional barcodes
    const barcodesResult = await client.execute({
      sql: "SELECT barcode FROM product_barcodes WHERE product_id = ?",
      args: [params.id],
    });

    const additionalBarcodes = barcodesResult.rows.map(
      (row) => (row as unknown as { barcode: string }).barcode
    );

    const product = result.rows[0] as unknown as Record<string, unknown>;
    product.additional_barcodes = additionalBarcodes;

    return NextResponse.json({ product });
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

    // Additional validation: Check if base_product_id exists and is of type 'base'
    if (validated.product_type === "packing" && validated.base_product_id) {
      const baseProduct = await client.execute({
        sql: "SELECT product_type, sku FROM products WHERE id = ? AND deleted_at IS NULL",
        args: [validated.base_product_id],
      });
      if (baseProduct.rows.length === 0) {
        return NextResponse.json(
          { error: "Base product not found" },
          { status: 400 }
        );
      }
      const baseProductData = baseProduct.rows[0] as unknown as {
        product_type: string;
        sku: string | null;
      };
      if (baseProductData.product_type !== "base") {
        return NextResponse.json(
          { error: "Base product must be of type 'base'" },
          { status: 400 }
        );
      }
      // For packing products, use the base product's SKU if not provided
      if (!validated.sku && baseProductData.sku) {
        validated.sku = baseProductData.sku;
      }
    }

    // Additional validation: Check if composite_product_id exists
    if (
      validated.product_type === "composite" &&
      validated.composite_product_id
    ) {
      const compositeBase = await client.execute({
        sql: "SELECT id, sku FROM products WHERE id = ? AND deleted_at IS NULL",
        args: [validated.composite_product_id],
      });
      if (compositeBase.rows.length === 0) {
        return NextResponse.json(
          { error: "Composite base product not found" },
          { status: 400 }
        );
      }
      const baseProductData = compositeBase.rows[0] as unknown as {
        id: number;
        sku: string | null;
      };
      // For composite products, use the base product's SKU if not provided
      if (!validated.sku && baseProductData.sku) {
        validated.sku = baseProductData.sku;
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
        } else if (key === "is_variable_quantity") {
          // Convert boolean to integer for database
          values.push((value as boolean) ? 1 : 0);
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

      await client.execute({
        sql: `UPDATE products SET ${updates.join(", ")} WHERE id = ?`,
        args: values,
      });
    }

    // Update additional barcodes if provided
    if (additionalBarcodes !== undefined) {
      // Delete existing additional barcodes
      await client.execute({
        sql: "DELETE FROM product_barcodes WHERE product_id = ?",
        args: [params.id],
      });

      // Insert new additional barcodes
      if (additionalBarcodes.length > 0) {
        for (const barcode of additionalBarcodes) {
          if (barcode && barcode.trim()) {
            try {
              await client.execute({
                sql: "INSERT INTO product_barcodes (product_id, barcode) VALUES (?, ?)",
                args: [params.id, barcode.trim()],
              });
            } catch (error) {
              // Ignore duplicate barcode errors
              console.warn(`Failed to add barcode ${barcode}:`, error);
            }
          }
        }
      }
    }

    // Fetch updated product with barcodes
    const result = await client.execute({
      sql: `SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.deleted_at IS NULL`,
      args: [params.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch additional barcodes
    const barcodesResult = await client.execute({
      sql: "SELECT barcode FROM product_barcodes WHERE product_id = ?",
      args: [params.id],
    });

    const fetchedBarcodes = barcodesResult.rows.map(
      (row) => (row as unknown as { barcode: string }).barcode
    );

    const product = result.rows[0] as unknown as Record<string, unknown>;
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

    // Check if product exists and is not already deleted
    const productCheck = await client.execute({
      sql: "SELECT id, name FROM products WHERE id = ?",
      args: [params.id],
    });

    if (productCheck.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Soft delete: set deleted_at timestamp
    await client.execute({
      sql: "UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?",
      args: [params.id],
    });

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

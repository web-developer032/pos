import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import {
  getPaginationParams,
  executePaginatedQuery,
  handleApiError,
  handleValidationError,
  roundPrice,
} from "@/lib/utils/apiHelpers";

const productUnitEnum = z.enum([
  "piece",
  "gram",
  "kilogram",
  "liter",
  "milliliter",
]);

const productTypeEnum = z.enum(['simple', 'base', 'packing', 'composite']);

const productSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().optional(),
  additional_barcodes: z.array(z.string()).optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  category_id: z.number().optional(),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0),
  stock_quantity: z.number().min(0),
  min_stock_level: z.number().min(0),
  unit: productUnitEnum.default("piece"),
  image_url: z.string().optional(),
  product_type: productTypeEnum.optional(),
  base_product_id: z.number().optional(),
  base_unit_quantity: z.number().optional(),
  composite_product_id: z.number().optional(),
  composite_quantity: z.number().optional(),
  is_variable_quantity: z.boolean().optional(),
}).refine((data) => {
  // Validation based on product_type
  if (data.product_type === 'packing') {
    // Packings must have base_product_id and base_unit_quantity
    if (!data.base_product_id || data.base_unit_quantity === undefined || data.base_unit_quantity <= 0) {
      return false;
    }
    // Packings cannot have composite fields
    if (data.composite_product_id !== undefined || data.composite_quantity !== undefined) {
      return false;
    }
    // Packings cannot have is_variable_quantity
    if (data.is_variable_quantity === true) {
      return false;
    }
  } else if (data.product_type === 'composite') {
    // Composites must have composite_product_id and composite_quantity
    if (!data.composite_product_id || data.composite_quantity === undefined || data.composite_quantity <= 0) {
      return false;
    }
    // Composites cannot have base fields
    if (data.base_product_id !== undefined || data.base_unit_quantity !== undefined) {
      return false;
    }
    // Composites cannot have is_variable_quantity
    if (data.is_variable_quantity === true) {
      return false;
    }
  } else if (data.product_type === 'base') {
    // Base products cannot have relationship fields
    if (data.base_product_id !== undefined || data.base_unit_quantity !== undefined) {
      return false;
    }
    if (data.composite_product_id !== undefined || data.composite_quantity !== undefined) {
      return false;
    }
  } else if (data.product_type === 'simple' || !data.product_type) {
    // Simple products cannot have any relationship fields
    if (data.base_product_id !== undefined || data.base_unit_quantity !== undefined) {
      return false;
    }
    if (data.composite_product_id !== undefined || data.composite_quantity !== undefined) {
      return false;
    }
    if (data.is_variable_quantity === true) {
      return false;
    }
  }
  return true;
}, {
  message: "Invalid product relationship configuration",
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");
    const { page, limit, offset } = getPaginationParams(req);

    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.deleted_at IS NULL
    `;
    const args: (string | number)[] = [];

    if (categoryId) {
      sql += " AND p.category_id = ?";
      args.push(categoryId);
    }

    // Add search condition - include product_barcodes table for barcode search
    if (search) {
      const searchTerm = `%${search}%`;
      sql += ` AND (
        p.name LIKE ? OR 
        p.barcode LIKE ? OR 
        p.sku LIKE ? OR
        EXISTS (
          SELECT 1 FROM product_barcodes pb 
          WHERE pb.product_id = p.id AND pb.barcode LIKE ?
        )
      )`;
      args.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const result = await executePaginatedQuery({
      baseSql: sql,
      baseArgs: args,
      orderBy: "p.name",
      page,
      limit,
      offset,
    });

    return NextResponse.json({
      products: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleApiError(error, "fetching products");
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = productSchema.parse(body);

    // Additional validation: Check if base_product_id exists and is of type 'base'
    if (validated.product_type === 'packing' && validated.base_product_id) {
      const baseProduct = await client.execute({
        sql: "SELECT product_type FROM products WHERE id = ? AND deleted_at IS NULL",
        args: [validated.base_product_id],
      });
      if (baseProduct.rows.length === 0) {
        return NextResponse.json(
          { error: "Base product not found" },
          { status: 400 }
        );
      }
      const baseProductType = (baseProduct.rows[0] as unknown as { product_type: string }).product_type;
      if (baseProductType !== 'base') {
        return NextResponse.json(
          { error: "Base product must be of type 'base'" },
          { status: 400 }
        );
      }
    }

    // Additional validation: Check if composite_product_id exists
    if (validated.product_type === 'composite' && validated.composite_product_id) {
      const compositeBase = await client.execute({
        sql: "SELECT id FROM products WHERE id = ? AND deleted_at IS NULL",
        args: [validated.composite_product_id],
      });
      if (compositeBase.rows.length === 0) {
        return NextResponse.json(
          { error: "Composite base product not found" },
          { status: 400 }
        );
      }
    }

    const result = await client.execute({
      sql: `INSERT INTO products (name, barcode, sku, description, category_id, 
            cost_price, selling_price, stock_quantity, min_stock_level, unit, image_url,
            product_type, base_product_id, base_unit_quantity, composite_product_id, 
            composite_quantity, is_variable_quantity) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        validated.name,
        validated.barcode || null,
        validated.sku || null,
        validated.description || null,
        validated.category_id || null,
        roundPrice(validated.cost_price),
        roundPrice(validated.selling_price),
        validated.stock_quantity,
        validated.min_stock_level,
        validated.unit || "piece",
        validated.image_url || null,
        validated.product_type || 'simple',
        validated.base_product_id || null,
        validated.base_unit_quantity || null,
        validated.composite_product_id || null,
        validated.composite_quantity || null,
        validated.is_variable_quantity ? 1 : 0,
      ],
    });

    const productId = (result.rows[0] as unknown as { id: number }).id;

    // Insert additional barcodes if provided
    if (
      validated.additional_barcodes &&
      validated.additional_barcodes.length > 0
    ) {
      for (const barcode of validated.additional_barcodes) {
        if (barcode && barcode.trim()) {
          try {
            await client.execute({
              sql: "INSERT INTO product_barcodes (product_id, barcode) VALUES (?, ?)",
              args: [productId, barcode.trim()],
            });
          } catch (error) {
            // Ignore duplicate barcode errors
            console.warn(`Failed to add barcode ${barcode}:`, error);
          }
        }
      }
    }

    return NextResponse.json({ product: result.rows[0] }, { status: 201 });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating product");
  }
}

async function deleteHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      // Soft delete all products (set deleted_at timestamp)
      await client.execute(
        "UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL"
      );

      return NextResponse.json({
        message: "All products deleted successfully",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "deleting products");
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);

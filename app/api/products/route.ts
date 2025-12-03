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

const productSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().optional(),
  additional_barcodes: z.array(z.string()).optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  category_id: z.number().optional(),
  supplier_id: z.number().optional(),
  cost_price: z.number().min(0),
  selling_price: z.number().min(0),
  stock_quantity: z.number().min(0),
  min_stock_level: z.number().min(0),
  unit: productUnitEnum.default("piece"),
  image_url: z.string().optional(),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");
    const { page, limit, offset } = getPaginationParams(req);

    let sql = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
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

    const result = await client.execute({
      sql: `INSERT INTO products (name, barcode, sku, description, category_id, supplier_id, 
            cost_price, selling_price, stock_quantity, min_stock_level, unit, image_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        validated.name,
        validated.barcode || null,
        validated.sku || null,
        validated.description || null,
        validated.category_id || null,
        validated.supplier_id || null,
        roundPrice(validated.cost_price),
        roundPrice(validated.selling_price),
        validated.stock_quantity,
        validated.min_stock_level,
        validated.unit || "piece",
        validated.image_url || null,
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

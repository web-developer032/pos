import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import {
  getPaginationParams,
  executePaginatedQuery,
  buildSearchCondition,
  handleApiError,
  handleValidationError,
} from "@/lib/utils/apiHelpers";

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
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (categoryId) {
      sql += " AND p.category_id = ?";
      args.push(categoryId);
    }

    // Add search condition
    const searchCondition = buildSearchCondition(search, ["name", "barcode", "sku"], "p");
    sql += searchCondition.sql;
    args.push(...searchCondition.args);

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
            cost_price, selling_price, stock_quantity, min_stock_level, image_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        validated.name,
        validated.barcode || null,
        validated.sku || null,
        validated.description || null,
        validated.category_id || null,
        validated.supplier_id || null,
        validated.cost_price,
        validated.selling_price,
        validated.stock_quantity,
        validated.min_stock_level,
        validated.image_url || null,
      ],
    });

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
      // Delete related records first (due to foreign key constraints)
      // Order matters: delete child records before parent records
      await client.execute("DELETE FROM sale_items");
      await client.execute("DELETE FROM purchase_order_items");
      await client.execute("DELETE FROM inventory_transactions");

      // Now delete products
      await client.execute("DELETE FROM products");

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

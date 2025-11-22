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

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = (page - 1) * limit;

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

    if (search) {
      sql += " AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)";
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countSql = sql.replace(
      /SELECT p\.\*, c\.name as category_name, s\.name as supplier_name/,
      "SELECT COUNT(*) as total"
    );
    const countResult = await client.execute({ sql: countSql, args });
    const total = (countResult.rows[0] as unknown as { total: number }).total;

    sql += " ORDER BY p.name LIMIT ? OFFSET ?";
    args.push(limit, offset);

    const result = await client.execute({ sql, args });
    return NextResponse.json({
      products: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
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
    console.error("Error deleting products:", error);
    return NextResponse.json(
      { error: "Failed to delete products" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);

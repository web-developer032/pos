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

    let sql = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (categoryId) {
      sql += " AND p.category_id = ?";
      args.push(categoryId);
    }

    if (search) {
      sql += " AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)";
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    sql += " ORDER BY p.name";

    const result = await client.execute({ sql, args });
    return NextResponse.json({ products: result.rows });
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

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

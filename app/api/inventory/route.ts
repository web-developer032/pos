import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function getHandler(req: NextRequest) {
  try {
    const result = await client.execute(`
      SELECT p.id, p.name, p.sku, p.barcode, p.stock_quantity, p.min_stock_level,
             c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name
    `);
    return NextResponse.json({ inventory: result.rows });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);


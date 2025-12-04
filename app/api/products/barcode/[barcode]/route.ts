import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const barcode = params.barcode as string;

    // Search in both products.barcode and product_barcodes table
    const result = await client.execute({
      sql: `SELECT DISTINCT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_barcodes pb ON p.id = pb.product_id
            WHERE (p.barcode = ? OR pb.barcode = ?) 
              AND p.deleted_at IS NULL
            LIMIT 1`,
      args: [barcode, barcode],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product: result.rows[0] });
  } catch (error) {
    console.error("Error fetching product by barcode:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);

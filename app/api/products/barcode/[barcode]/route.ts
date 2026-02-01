import { NextResponse } from "next/server";
import { requireAuth, RouteContext, type AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { sqlQuery } from "@/lib/db";

async function getHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const userId = getCurrentUserId(req);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const barcode = params.barcode as string;

    const sql = `SELECT DISTINCT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id AND c.user_id = ?
            LEFT JOIN product_barcodes pb ON p.id = pb.product_id
            WHERE (p.barcode = ? OR pb.barcode = ?) 
              AND p.user_id = ? AND p.deleted_at IS NULL
            LIMIT 1`;
    const rows = await sqlQuery<Record<string, unknown> & { id: number }>(sql, [userId, barcode, barcode, userId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = rows[0];

    const barcodeRows = await sqlQuery<{ barcode: string }>(
      "SELECT barcode FROM product_barcodes WHERE product_id = ?",
      [product.id]
    );

    const additional_barcodes = barcodeRows.map((row) => row.barcode);

    return NextResponse.json({
      product: {
        ...product,
        additional_barcodes,
      },
    });
  } catch (error) {
    console.error("Error fetching product by barcode:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "products" });

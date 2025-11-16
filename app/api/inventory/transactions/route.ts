import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id");

    let sql = `
      SELECT it.*, p.name as product_name
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (productId) {
      sql += " AND it.product_id = ?";
      args.push(productId);
    }

    sql += " ORDER BY it.created_at DESC LIMIT 100";

    const result = await client.execute({ sql, args });
    return NextResponse.json({ transactions: result.rows });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);


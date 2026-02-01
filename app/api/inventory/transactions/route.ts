import { NextResponse } from "next/server";
import { requireAuth, type AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { sqlQuery } from "@/lib/db";

async function getHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id");

    let sql = `
      SELECT it.*, 
             COALESCE(p.name, 'Deleted Product') as product_name
      FROM inventory_transactions it
      LEFT JOIN products p ON it.product_id = p.id AND p.user_id = ?
      WHERE p.user_id = ?
    `;
    const args: (string | number)[] = [userId, userId];

    if (productId) {
      sql += " AND it.product_id = ?";
      args.push(productId);
    }

    sql += " ORDER BY it.created_at DESC LIMIT 100";

    const rows = await sqlQuery(sql, args);
    return NextResponse.json({ transactions: rows });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "inventory" });

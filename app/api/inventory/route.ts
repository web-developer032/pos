import { NextResponse } from "next/server";
import { requireAuth, type AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import {
  getPaginationParams,
  executePaginatedQuery,
  handleApiError,
} from "@/lib/utils/apiHelpers";

async function getHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const { page, limit, offset } = getPaginationParams(req);

    const sql = `
      SELECT p.id, p.name, p.sku, p.barcode, p.stock_quantity, p.min_stock_level,
             p.unit, p.base_product_id, p.quantity_multiplier,
             c.name as category_name,
             bp.stock_quantity as base_product_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id AND c.user_id = ?
      LEFT JOIN products bp ON p.base_product_id = bp.id AND bp.user_id = ?
      WHERE p.deleted_at IS NULL AND p.user_id = ?
    `;

    const result = await executePaginatedQuery({
      baseSql: sql,
      baseArgs: [userId, userId, userId],
      orderBy: "p.name",
      page,
      limit,
      offset,
    });

    return NextResponse.json({
      inventory: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleApiError(error, "fetching inventory");
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "inventory" });

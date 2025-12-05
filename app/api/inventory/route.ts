import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import {
  getPaginationParams,
  executePaginatedQuery,
  handleApiError,
} from "@/lib/utils/apiHelpers";

async function getHandler(req: NextRequest) {
  try {
    const { page, limit, offset } = getPaginationParams(req);

    const sql = `
      SELECT p.id, p.name, p.sku, p.barcode, p.stock_quantity, p.min_stock_level,
             p.unit, p.product_type, p.base_product_id, p.base_unit_quantity,
             p.composite_product_id, p.composite_quantity,
             c.name as category_name,
             bp.stock_quantity as base_product_stock,
             cp.stock_quantity as composite_base_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN products bp ON p.base_product_id = bp.id AND p.product_type = 'packing'
      LEFT JOIN products cp ON p.composite_product_id = cp.id AND p.product_type = 'composite'
      WHERE p.deleted_at IS NULL
    `;

    const result = await executePaginatedQuery({
      baseSql: sql,
      baseArgs: [],
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

export const GET = requireAuth(getHandler);

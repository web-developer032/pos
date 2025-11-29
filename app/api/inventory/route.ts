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
             c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
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

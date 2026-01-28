import { NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import { sqlQuery } from "@/lib/db";

async function getHandler(req: Request, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const saleId = parseInt(params.id);

    const saleCheckRows = await sqlQuery("SELECT id FROM sales WHERE id = ?", [saleId]);

    if (saleCheckRows.length === 0) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    const returnsRows = await sqlQuery(
      `SELECT r.*, u.username as user_name
            FROM returns r
            JOIN users u ON r.user_id = u.id
            WHERE r.sale_id = ?
            ORDER BY r.created_at DESC`,
      [saleId]
    );

    const returnIds = returnsRows.map((r) => (r as unknown as { id: number }).id);

    let returnItems: unknown[] = [];
    if (returnIds.length > 0) {
      const placeholders = returnIds.map(() => "?").join(",");
      const itemsRows = await sqlQuery(
        `SELECT ri.*, p.name as product_name, p.barcode, p.cost_price as product_cost_price,
                     COALESCE(si.cost_price, p.cost_price) as cost_price
              FROM return_items ri
              JOIN products p ON ri.product_id = p.id
              LEFT JOIN sale_items si ON ri.sale_item_id = si.id
              WHERE ri.return_id IN (${placeholders})`,
        returnIds
      );
      returnItems = itemsRows;
    }

    const saleItemsRows = await sqlQuery(
      `SELECT si.id, si.quantity as original_quantity,
                   COALESCE(SUM(ri.quantity), 0) as returned_quantity
            FROM sale_items si
            LEFT JOIN return_items ri ON si.id = ri.sale_item_id
            WHERE si.sale_id = ?
            GROUP BY si.id`,
      [saleId]
    );

    return NextResponse.json({
      returns: returnsRows,
      return_items: returnItems,
      sale_items_status: saleItemsRows,
    });
  } catch (error) {
    console.error("Error fetching sale returns:", error);
    return NextResponse.json(
      { error: "Failed to fetch sale returns" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);


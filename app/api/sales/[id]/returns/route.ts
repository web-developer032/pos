import { NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function getHandler(req: Request, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const saleId = parseInt(params.id);

    // Verify sale exists
    const saleCheck = await client.execute({
      sql: "SELECT id FROM sales WHERE id = ?",
      args: [saleId],
    });

    if (saleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    // Get all returns for this sale
    const returnsResult = await client.execute({
      sql: `SELECT r.*, u.username as user_name
            FROM returns r
            JOIN users u ON r.user_id = u.id
            WHERE r.sale_id = ?
            ORDER BY r.created_at DESC`,
      args: [saleId],
    });

    // Get return items for all returns
    const returnIds = returnsResult.rows.map(
      (r) => (r as unknown as { id: number }).id
    );

    let returnItems: unknown[] = [];
    if (returnIds.length > 0) {
      const placeholders = returnIds.map(() => "?").join(",");
      const itemsResult = await client.execute({
        sql: `SELECT ri.*, p.name as product_name, p.barcode
              FROM return_items ri
              JOIN products p ON ri.product_id = p.id
              WHERE ri.return_id IN (${placeholders})`,
        args: returnIds,
      });
      returnItems = itemsResult.rows;
    }

    // Calculate total returned per sale item
    const saleItemsResult = await client.execute({
      sql: `SELECT si.id, si.quantity as original_quantity,
                   COALESCE(SUM(ri.quantity), 0) as returned_quantity
            FROM sale_items si
            LEFT JOIN return_items ri ON si.id = ri.sale_item_id
            WHERE si.sale_id = ?
            GROUP BY si.id`,
      args: [saleId],
    });

    return NextResponse.json({
      returns: returnsResult.rows,
      return_items: returnItems,
      sale_items_status: saleItemsResult.rows,
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


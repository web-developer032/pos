import { NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import { sqlQuery } from "@/lib/db";

async function getHandler(req: Request, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const returnRows = await sqlQuery(
      `SELECT r.*, u.username as user_name, s.sale_number
            FROM returns r
            JOIN users u ON r.user_id = u.id
            JOIN sales s ON r.sale_id = s.id
            WHERE r.id = ?`,
      [id]
    );

    if (returnRows.length === 0) {
      return NextResponse.json(
        { error: "Return not found" },
        { status: 404 }
      );
    }

    const itemsRows = await sqlQuery(
      `SELECT ri.*, p.name as product_name, p.barcode, p.cost_price as product_cost_price,
                   COALESCE(si.cost_price, p.cost_price) as cost_price
            FROM return_items ri
            JOIN products p ON ri.product_id = p.id
            LEFT JOIN sale_items si ON ri.sale_item_id = si.id
            WHERE ri.return_id = ?`,
      [id]
    );

    return NextResponse.json({
      return: returnRows[0],
      items: itemsRows,
    });
  } catch (error) {
    console.error("Error fetching return:", error);
    return NextResponse.json(
      { error: "Failed to fetch return" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);

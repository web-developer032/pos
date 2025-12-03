import { NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function getHandler(req: Request, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = parseInt(params.id);

    const result = await client.execute({
      sql: `SELECT r.*, u.username as user_name, s.sale_number
            FROM returns r
            JOIN users u ON r.user_id = u.id
            JOIN sales s ON r.sale_id = s.id
            WHERE r.id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Return not found" },
        { status: 404 }
      );
    }

    // Get return items
    const itemsResult = await client.execute({
      sql: `SELECT ri.*, p.name as product_name, p.barcode
            FROM return_items ri
            JOIN products p ON ri.product_id = p.id
            WHERE ri.return_id = ?`,
      args: [id],
    });

    return NextResponse.json({
      return: result.rows[0],
      items: itemsResult.rows,
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


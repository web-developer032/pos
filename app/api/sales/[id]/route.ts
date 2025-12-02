import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const saleResult = await client.execute({
      sql: `SELECT s.*, u.username as user_name, c.name as customer_name
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.id = ?`,
      args: [params.id],
    });

    if (saleResult.rows.length === 0) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const itemsResult = await client.execute({
      sql: `SELECT si.*, 
                   COALESCE(p.name, 'Deleted Product') as product_name, 
                   p.barcode
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?`,
      args: [params.id],
    });

    return NextResponse.json({
      sale: saleResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error("Error fetching sale:", error);
    return NextResponse.json(
      { error: "Failed to fetch sale" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const saleId = parseInt(params.id as string);

    if (isNaN(saleId)) {
      return NextResponse.json({ error: "Invalid sale ID" }, { status: 400 });
    }

    // Check if sale exists
    const saleCheck = await client.execute({
      sql: "SELECT id FROM sales WHERE id = ?",
      args: [saleId],
    });

    if (saleCheck.rows.length === 0) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Get sale items to restore inventory
    const itemsResult = await client.execute({
      sql: "SELECT product_id, quantity FROM sale_items WHERE sale_id = ?",
      args: [saleId],
    });

    // Restore inventory for each item
    for (const item of itemsResult.rows) {
      const productId = item.product_id as number;
      const quantity = item.quantity as number;

      // Restore stock quantity (only if product exists and is not deleted)
      await client.execute({
        sql: `UPDATE products 
              SET stock_quantity = stock_quantity + ? 
              WHERE id = ? AND deleted_at IS NULL`,
        args: [quantity, productId],
      });
    }

    // Delete inventory transactions related to this sale
    await client.execute({
      sql: "DELETE FROM inventory_transactions WHERE reference_id = ? AND transaction_type = 'sale'",
      args: [saleId],
    });

    // Delete payment records
    await client.execute({
      sql: "DELETE FROM payments WHERE sale_id = ?",
      args: [saleId],
    });

    // Delete sale items
    await client.execute({
      sql: "DELETE FROM sale_items WHERE sale_id = ?",
      args: [saleId],
    });

    // Delete the sale
    await client.execute({
      sql: "DELETE FROM sales WHERE id = ?",
      args: [saleId],
    });

    return NextResponse.json({ message: "Sale deleted successfully" });
  } catch (error) {
    console.error("Error deleting sale:", error);
    return NextResponse.json(
      { error: "Failed to delete sale" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const DELETE = requireAuth(deleteHandler);

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

    // Use stored cost_price from sale_items instead of current product cost_price
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

    // Check if there are returns for this sale
    const returnsCheck = await client.execute({
      sql: "SELECT id FROM returns WHERE sale_id = ?",
      args: [saleId],
    });

    if (returnsCheck.rows.length > 0) {
      // If there are returns, we need to reverse their inventory adjustments first
      // Get return items to reverse inventory adjustments
      const returnItemsResult = await client.execute({
        sql: `SELECT ri.product_id, ri.quantity 
              FROM return_items ri
              JOIN returns r ON ri.return_id = r.id
              WHERE r.sale_id = ?`,
        args: [saleId],
      });

      // Reverse inventory adjustments from returns (subtract the returned quantities)
      // This undoes the inventory restoration that happened when items were returned
      for (const item of returnItemsResult.rows) {
        const productId = item.product_id as number;
        const quantity = item.quantity as number;

        await client.execute({
          sql: `UPDATE products 
                SET stock_quantity = stock_quantity - ? 
                WHERE id = ? AND deleted_at IS NULL`,
          args: [quantity, productId],
        });
      }

      // Delete return items (will be cascaded when returns are deleted, but being explicit)
      await client.execute({
        sql: `DELETE FROM return_items 
              WHERE return_id IN (SELECT id FROM returns WHERE sale_id = ?)`,
        args: [saleId],
      });

      // Delete inventory transactions related to returns
      await client.execute({
        sql: `DELETE FROM inventory_transactions 
              WHERE reference_id IN (SELECT id FROM returns WHERE sale_id = ?) 
              AND transaction_type = 'return'`,
        args: [saleId],
      });

      // Delete returns (will cascade from sale deletion, but being explicit for clarity)
      await client.execute({
        sql: "DELETE FROM returns WHERE sale_id = ?",
        args: [saleId],
      });
    }

    // Get sale items to restore inventory
    const itemsResult = await client.execute({
      sql: "SELECT product_id, quantity FROM sale_items WHERE sale_id = ?",
      args: [saleId],
    });

    // Restore inventory for each item
    // This restores the full sale quantity, which is correct because we've already
    // reversed any return adjustments above
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

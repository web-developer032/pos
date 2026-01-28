import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import { sqlQuery, sqlExecute } from "@/lib/db";

async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const saleRows = await sqlQuery(
      `SELECT s.*, u.username as user_name, c.name as customer_name
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.id = ?`,
      [params.id]
    );

    if (saleRows.length === 0) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const itemsRows = await sqlQuery(
      `SELECT si.*, 
                   COALESCE(p.name, 'Deleted Product') as product_name, 
                   p.barcode
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?`,
      [params.id]
    );

    return NextResponse.json({
      sale: saleRows[0],
      items: itemsRows,
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
    const saleId = parseInt(params.id as string, 10);

    if (Number.isNaN(saleId)) {
      return NextResponse.json({ error: "Invalid sale ID" }, { status: 400 });
    }

    const saleCheckRows = await sqlQuery("SELECT id FROM sales WHERE id = ?", [saleId]);

    if (saleCheckRows.length === 0) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const returnsCheckRows = await sqlQuery(
      "SELECT id FROM returns WHERE sale_id = ?",
      [saleId]
    );

    if (returnsCheckRows.length > 0) {
      const returnItemsRows = await sqlQuery<{ product_id: number; quantity: number }>(
        `SELECT ri.product_id, ri.quantity 
              FROM return_items ri
              JOIN returns r ON ri.return_id = r.id
              WHERE r.sale_id = ?`,
        [saleId]
      );

      for (const item of returnItemsRows) {
        await sqlExecute(
          `UPDATE products 
                SET stock_quantity = stock_quantity - ? 
                WHERE id = ? AND deleted_at IS NULL`,
          [item.quantity, item.product_id]
        );
      }

      await sqlExecute(
        `DELETE FROM return_items 
              WHERE return_id IN (SELECT id FROM returns WHERE sale_id = ?)`,
        [saleId]
      );

      await sqlExecute(
        `DELETE FROM inventory_transactions 
              WHERE reference_id IN (SELECT id FROM returns WHERE sale_id = ?) 
              AND transaction_type = 'return'`,
        [saleId]
      );

      await sqlExecute("DELETE FROM returns WHERE sale_id = ?", [saleId]);
    }

    const itemsRows = await sqlQuery<{ product_id: number; quantity: number }>(
      "SELECT product_id, quantity FROM sale_items WHERE sale_id = ?",
      [saleId]
    );

    for (const item of itemsRows) {
      await sqlExecute(
        `UPDATE products 
              SET stock_quantity = stock_quantity + ? 
              WHERE id = ? AND deleted_at IS NULL`,
        [item.quantity, item.product_id]
      );
    }

    await sqlExecute(
      "DELETE FROM inventory_transactions WHERE reference_id = ? AND transaction_type = 'sale'",
      [saleId]
    );

    await sqlExecute("DELETE FROM payments WHERE sale_id = ?", [saleId]);

    await sqlExecute("DELETE FROM sale_items WHERE sale_id = ?", [saleId]);

    await sqlExecute("DELETE FROM sales WHERE id = ?", [saleId]);

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

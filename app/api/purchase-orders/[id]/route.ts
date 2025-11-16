import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

async function getHandler(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const poResult = await client.execute({
      sql: `SELECT po.*, s.name as supplier_name, u.username as user_name
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            JOIN users u ON po.user_id = u.id
            WHERE po.id = ?`,
      args: [params.id],
    });

    if (poResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const itemsResult = await client.execute({
      sql: `SELECT poi.*, p.name as product_name
            FROM purchase_order_items poi
            JOIN products p ON poi.product_id = p.id
            WHERE poi.po_id = ?`,
      args: [params.id],
    });

    return NextResponse.json({
      purchase_order: poResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order" },
      { status: 500 }
    );
  }
}

async function putHandler(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const status = body.status;

    if (!["pending", "completed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const result = await client.execute({
      sql: "UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *",
      args: [status, params.id],
    });

    // If completing, update inventory
    if (status === "completed") {
      const itemsResult = await client.execute({
        sql: "SELECT product_id, quantity FROM purchase_order_items WHERE po_id = ?",
        args: [params.id],
      });

      for (const item of itemsResult.rows as any[]) {
        await client.execute({
          sql: "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?",
          args: [item.quantity, item.product_id],
        });

        await client.execute({
          sql: `INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_id) 
                VALUES (?, ?, ?, ?)`,
          args: [item.product_id, "purchase", item.quantity, parseInt(params.id)],
        });
      }
    }

    return NextResponse.json({ purchase_order: result.rows[0] });
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);


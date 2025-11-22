import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
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

const updateItemsSchema = z.object({
  supplier_id: z.number().optional(),
  items: z
    .array(
      z.object({
        product_id: z.number(),
        quantity: z.number().int().min(1),
        unit_cost: z.number().min(0),
      })
    )
    .optional(),
});

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const body = await req.json();

    // Check if this is an items update or status update
    if (body.items !== undefined || body.supplier_id !== undefined) {
      // Update items
      const validated = updateItemsSchema.parse(body);
      const poId = parseInt(params.id);

      // Check if PO exists and is pending
      const poCheck = await client.execute({
        sql: "SELECT status FROM purchase_orders WHERE id = ?",
        args: [poId],
      });

      if (poCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Purchase order not found" },
          { status: 404 }
        );
      }

      const poStatus = (poCheck.rows[0] as unknown as { status: string })
        .status;
      if (poStatus !== "pending") {
        return NextResponse.json(
          { error: "Can only edit pending purchase orders" },
          { status: 400 }
        );
      }

      // Update supplier if provided
      if (validated.supplier_id) {
        await client.execute({
          sql: "UPDATE purchase_orders SET supplier_id = ? WHERE id = ?",
          args: [validated.supplier_id, poId],
        });
      }

      // Update items if provided
      if (validated.items) {
        // Delete existing items
        await client.execute({
          sql: "DELETE FROM purchase_order_items WHERE po_id = ?",
          args: [poId],
        });

        // Calculate new total
        const totalAmount = validated.items.reduce(
          (sum, item) => sum + item.quantity * item.unit_cost,
          0
        );

        // Insert new items
        for (const item of validated.items) {
          await client.execute({
            sql: `INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost, subtotal) 
                  VALUES (?, ?, ?, ?, ?)`,
            args: [
              poId,
              item.product_id,
              item.quantity,
              item.unit_cost,
              item.quantity * item.unit_cost,
            ],
          });
        }

        // Update total amount
        await client.execute({
          sql: "UPDATE purchase_orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
          args: [totalAmount, poId],
        });
      }

      // Fetch updated PO
      const updatedPO = await client.execute({
        sql: `SELECT po.*, s.name as supplier_name, u.username as user_name
              FROM purchase_orders po
              JOIN suppliers s ON po.supplier_id = s.id
              JOIN users u ON po.user_id = u.id
              WHERE po.id = ?`,
        args: [poId],
      });

      return NextResponse.json({ purchase_order: updatedPO.rows[0] });
    } else {
      // Status update (existing logic)
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

        for (const item of itemsResult.rows as unknown as {
          product_id: number;
          quantity: number;
        }[]) {
          await client.execute({
            sql: "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?",
            args: [item.quantity, item.product_id],
          });

          await client.execute({
            sql: `INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_id) 
                  VALUES (?, ?, ?, ?)`,
            args: [
              item.product_id,
              "purchase",
              item.quantity,
              parseInt(params.id),
            ],
          });
        }
      }

      return NextResponse.json({ purchase_order: result.rows[0] });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);

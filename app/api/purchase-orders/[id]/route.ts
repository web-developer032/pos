import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import { roundPrice } from "@/lib/utils/apiHelpers";
import { updateProductQuantity } from "@/lib/utils/productQuantity";

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
      sql: `SELECT poi.*, COALESCE(p.name, 'Deleted Product') as product_name
            FROM purchase_order_items poi
            LEFT JOIN products p ON poi.product_id = p.id
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
  discount_type: z.enum(["percentage", "amount"]).optional(),
  discount_value: z.number().min(0).optional(),
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

        // Calculate subtotal
        const subtotal = roundPrice(
          validated.items.reduce(
            (sum, item) => sum + item.quantity * roundPrice(item.unit_cost),
            0
          )
        );

        // Calculate discount
        let discountAmount = 0;
        if (validated.discount_type && validated.discount_value) {
          if (validated.discount_type === "percentage") {
            discountAmount = roundPrice(
              (subtotal * validated.discount_value) / 100
            );
          } else {
            discountAmount = roundPrice(validated.discount_value);
          }
        }
        const totalAmount = roundPrice(Math.max(0, subtotal - discountAmount));

        // Insert new items
        for (const item of validated.items) {
          const roundedUnitCost = roundPrice(item.unit_cost);
          const itemSubtotal = roundPrice(item.quantity * roundedUnitCost);
          await client.execute({
            sql: `INSERT INTO purchase_order_items (po_id, product_id, quantity, unit_cost, subtotal) 
                  VALUES (?, ?, ?, ?, ?)`,
            args: [
              poId,
              item.product_id,
              item.quantity,
              roundedUnitCost,
              itemSubtotal,
            ],
          });
        }

        // Update total amount and discount
        await client.execute({
          sql: `UPDATE purchase_orders 
                SET total_amount = ?, 
                    discount_type = ?, 
                    discount_value = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?`,
          args: [
            totalAmount,
            validated.discount_type || null,
            validated.discount_value || null,
            poId,
          ],
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

      // If completing, update inventory and cost prices
      if (status === "completed") {
        const itemsResult = await client.execute({
          sql: "SELECT product_id, quantity, unit_cost FROM purchase_order_items WHERE po_id = ?",
          args: [params.id],
        });

        for (const item of itemsResult.rows as unknown as {
          product_id: number;
          quantity: number;
          unit_cost: number;
        }[]) {
          // Get current product information
          const productResult = await client.execute({
            sql: "SELECT cost_price, stock_quantity FROM products WHERE id = ?",
            args: [item.product_id],
          });

          if (productResult.rows.length === 0) {
            continue; // Skip if product doesn't exist
          }

          const product = productResult.rows[0] as unknown as {
            cost_price: number;
            stock_quantity: number;
          };

          const currentStock = product.stock_quantity || 0;
          const currentCost = product.cost_price || 0;
          const newQuantity = item.quantity;
          const newCost = item.unit_cost;

          // Calculate new cost price
          let newCostPrice: number;
          if (currentStock > 0) {
            // Average cost calculation: weighted average
            const totalCurrentValue = currentStock * currentCost;
            const totalNewValue = newQuantity * newCost;
            const totalQuantity = currentStock + newQuantity;
            newCostPrice = (totalCurrentValue + totalNewValue) / totalQuantity;
          } else {
            // No existing stock, replace cost price
            newCostPrice = newCost;
          }

          // Update stock quantity with relationship logic
          await updateProductQuantity(item.product_id, item.quantity, 'add', parseInt(params.id), 'purchase');
          
          // Update cost price on the actual product being purchased
          // Note: For packings/composites, cost price is stored on the product itself, not the base
          await client.execute({
            sql: "UPDATE products SET cost_price = ? WHERE id = ?",
            args: [roundPrice(newCostPrice), item.product_id],
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

async function deleteHandler(req: AuthRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const poId = parseInt(params.id);

    // Check if purchase order exists
    const poCheck = await client.execute({
      sql: "SELECT id, status FROM purchase_orders WHERE id = ?",
      args: [poId],
    });

    if (poCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const poStatus = (poCheck.rows[0] as unknown as { status: string }).status;

    // If completed, reverse inventory changes
    if (poStatus === "completed") {
      const itemsResult = await client.execute({
        sql: "SELECT product_id, quantity FROM purchase_order_items WHERE po_id = ?",
        args: [poId],
      });

      // Reverse inventory for each item (subtract quantities that were added)
      for (const item of itemsResult.rows) {
        const productId = item.product_id as number;
        const quantity = item.quantity as number;

        // Subtract stock quantity with relationship logic
        await updateProductQuantity(productId, quantity, 'subtract', poId, 'purchase');
      }
    }

    // Delete inventory transactions related to this purchase order
    await client.execute({
      sql: "DELETE FROM inventory_transactions WHERE reference_id = ? AND transaction_type = 'purchase'",
      args: [poId],
    });

    // Delete purchase order items
    await client.execute({
      sql: "DELETE FROM purchase_order_items WHERE po_id = ?",
      args: [poId],
    });

    // Delete the purchase order
    await client.execute({
      sql: "DELETE FROM purchase_orders WHERE id = ?",
      args: [poId],
    });

    return NextResponse.json({
      message: "Purchase order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase order" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

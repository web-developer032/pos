import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext, AuthRequest } from "@/lib/middleware/auth";
import { sqlQuery, sqlExecute } from "@/lib/db";
import { z } from "zod";
import { roundPrice } from "@/lib/utils/apiHelpers";
import { updateProductQuantity } from "@/lib/utils/productQuantity";

async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const poRows = await sqlQuery(
      `SELECT po.*, s.name as supplier_name, u.username as user_name
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            JOIN users u ON po.user_id = u.id
            WHERE po.id = ?`,
      [params.id]
    );

    if (poRows.length === 0) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const itemsRows = await sqlQuery(
      `SELECT poi.*, 
            COALESCE(poi.product_name, p.name, 'Deleted Product') as product_name,
            p.sku as product_sku,
            p.barcode as product_barcode,
            p.cost_price as product_cost_price,
            p.selling_price as product_selling_price
            FROM purchase_order_items poi
            LEFT JOIN products p ON poi.product_id = p.id AND p.deleted_at IS NULL
            WHERE poi.po_id = ?`,
      [params.id]
    );

    const paymentsRows = await sqlQuery(
      `SELECT sp.*, u.username as user_name
            FROM supplier_payments sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.purchase_order_id = ?
            ORDER BY sp.created_at DESC`,
      [params.id]
    );

    const totalPaid = paymentsRows.reduce<number>(
      (sum, payment) => sum + Number((payment as Record<string, unknown>).amount ?? 0),
      0
    );

    return NextResponse.json({
      purchase_order: poRows[0],
      items: itemsRows,
      payments: paymentsRows,
      total_paid: totalPaid,
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
        product_name: z.string().optional(),
        quantity: z.number().min(0.001),
        unit_cost: z.number().min(0),
        retail_price: z.number().min(0).optional(),
      })
    )
    .optional(),
  discount_type: z.enum(["percentage", "amount"]).optional(),
  discount_value: z.number().min(0).optional(),
  tax_type: z.enum(["percentage", "amount"]).optional(),
  tax_value: z.number().min(0).optional(),
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

      const poCheckRows = await sqlQuery(
        "SELECT status FROM purchase_orders WHERE id = ?",
        [poId]
      );

      if (poCheckRows.length === 0) {
        return NextResponse.json(
          { error: "Purchase order not found" },
          { status: 404 }
        );
      }

      const poStatus = (poCheckRows[0] as Record<string, unknown>).status as string;

      if (validated.supplier_id) {
        await sqlExecute(
          "UPDATE purchase_orders SET supplier_id = ? WHERE id = ?",
          [validated.supplier_id, poId]
        );
      }

      if (validated.items) {
        if (poStatus === "completed") {
          const existingItemsRows = await sqlQuery(
            "SELECT product_id, quantity, unit_cost, retail_price FROM purchase_order_items WHERE po_id = ?",
            [poId]
          );

          const oldItems = new Map<
            number,
            { quantity: number; unit_cost: number; retail_price: number | null }
          >();
          for (const row of existingItemsRows) {
            const item = row as unknown as {
              product_id: number;
              quantity: number;
              unit_cost: number;
              retail_price: number | null;
            };
            oldItems.set(item.product_id, {
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              retail_price: item.retail_price,
            });
          }

          // Build new items map
          const newItems = new Map<
            number,
            { quantity: number; unit_cost: number; retail_price: number | null }
          >();
          for (const item of validated.items) {
            newItems.set(item.product_id, {
              quantity: item.quantity,
              unit_cost: item.unit_cost,
              retail_price: item.retail_price ?? null,
            });
          }

          // Calculate and apply differential stock changes
          // Handle items that were removed (in old but not in new)
          for (const [productId, oldItem] of oldItems) {
            if (!newItems.has(productId)) {
              // Item was removed - subtract full quantity
              await updateProductQuantity(
                productId,
                oldItem.quantity,
                "subtract",
                poId,
                "purchase"
              );
            }
          }

          // Handle items that were added or modified
          for (const [productId, newItem] of newItems) {
            const oldItem = oldItems.get(productId);

            if (!oldItem) {
              // New item added - add full quantity and update prices
              await updateProductQuantity(
                productId,
                newItem.quantity,
                "add",
                poId,
                "purchase"
              );

              if (newItem.unit_cost > 0) {
                const productRows = await sqlQuery(
                  "SELECT cost_price, stock_quantity FROM products WHERE id = ?",
                  [productId]
                );
                if (productRows.length > 0) {
                  const product = productRows[0] as Record<string, unknown>;
                  const currentStock = Number(product.stock_quantity ?? 0);
                  const currentCost = Number(product.cost_price ?? 0);
                  const totalStock = currentStock;
                  const newCostPrice =
                    totalStock > 0
                      ? (currentCost * (totalStock - newItem.quantity) +
                          newItem.unit_cost * newItem.quantity) /
                        totalStock
                      : newItem.unit_cost;
                  await sqlExecute(
                    "UPDATE products SET cost_price = ? WHERE id = ?",
                    [roundPrice(newCostPrice), productId]
                  );
                }
              }

              if (newItem.retail_price && newItem.retail_price > 0) {
                await sqlExecute(
                  "UPDATE products SET selling_price = ? WHERE id = ?",
                  [roundPrice(newItem.retail_price), productId]
                );
              }
            } else {
              // Existing item - check for quantity/price changes
              const qtyDiff = newItem.quantity - oldItem.quantity;

              if (qtyDiff !== 0) {
                // Quantity changed - apply differential
                if (qtyDiff > 0) {
                  // Quantity increased - add the difference
                  await updateProductQuantity(
                    productId,
                    qtyDiff,
                    "add",
                    poId,
                    "purchase"
                  );

                  const productRows = await sqlQuery(
                    "SELECT cost_price, stock_quantity FROM products WHERE id = ?",
                    [productId]
                  );
                  if (productRows.length > 0) {
                    const product = productRows[0] as Record<string, unknown>;
                    const currentStock = Number(product.stock_quantity ?? 0);
                    const currentCost = Number(product.cost_price ?? 0);
                    if (currentStock > 0) {
                      const totalValue =
                        currentCost * (currentStock - qtyDiff) +
                        newItem.unit_cost * qtyDiff;
                      const newCostPrice = totalValue / currentStock;
                      await sqlExecute(
                        "UPDATE products SET cost_price = ? WHERE id = ?",
                        [roundPrice(newCostPrice), productId]
                      );
                    }
                  }
                } else {
                  // Quantity decreased - subtract the difference
                  await updateProductQuantity(
                    productId,
                    Math.abs(qtyDiff),
                    "subtract",
                    poId,
                    "purchase"
                  );
                  // No cost recalculation needed for decrease
                }
              }

              if (
                newItem.retail_price &&
                newItem.retail_price > 0 &&
                newItem.retail_price !== oldItem.retail_price
              ) {
                await sqlExecute(
                  "UPDATE products SET selling_price = ? WHERE id = ?",
                  [roundPrice(newItem.retail_price), productId]
                );
              }
            }
          }
        }

        await sqlExecute(
          "DELETE FROM purchase_order_items WHERE po_id = ?",
          [poId]
        );

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

        // Calculate tax
        const afterDiscount = Math.max(0, subtotal - discountAmount);
        let taxAmount = 0;
        if (validated.tax_type && validated.tax_value) {
          if (validated.tax_type === "percentage") {
            taxAmount = roundPrice((afterDiscount * validated.tax_value) / 100);
          } else {
            taxAmount = roundPrice(validated.tax_value);
          }
        }

        const totalAmount = roundPrice(afterDiscount + taxAmount);

        for (const item of validated.items) {
          const roundedUnitCost = roundPrice(item.unit_cost);
          const roundedRetailPrice = item.retail_price
            ? roundPrice(item.retail_price)
            : null;
          const itemSubtotal = roundPrice(item.quantity * roundedUnitCost);
          await sqlExecute(
            `INSERT INTO purchase_order_items (po_id, product_id, product_name, quantity, unit_cost, retail_price, subtotal) 
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              poId,
              item.product_id,
              item.product_name ?? null,
              item.quantity,
              roundedUnitCost,
              roundedRetailPrice,
              itemSubtotal,
            ]
          );
        }

        await sqlExecute(
          `UPDATE purchase_orders 
                SET total_amount = ?, 
                    discount_type = ?, 
                    discount_value = ?,
                    tax_type = ?,
                    tax_value = ?,
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?`,
          [
            totalAmount,
            validated.discount_type ?? null,
            validated.discount_value ?? null,
            validated.tax_type ?? null,
            validated.tax_value ?? null,
            poId,
          ]
        );
      }

      const updatedPORows = await sqlQuery(
        `SELECT po.*, s.name as supplier_name, u.username as user_name
              FROM purchase_orders po
              JOIN suppliers s ON po.supplier_id = s.id
              JOIN users u ON po.user_id = u.id
              WHERE po.id = ?`,
        [poId]
      );

      return NextResponse.json({ purchase_order: updatedPORows[0] });
    } else {
      // Status update (existing logic)
      const status = body.status;

      if (!["pending", "completed", "cancelled"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      const resultRows = await sqlQuery(
        "UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *",
        [status, params.id]
      );

      if (status === "completed") {
        const poRows = await sqlQuery(
          "SELECT discount_type, discount_value, total_amount FROM purchase_orders WHERE id = ?",
          [params.id]
        );

        const po = poRows[0] as unknown as {
          discount_type: string | null;
          discount_value: number | null;
          total_amount: number;
        };

        const itemsRows = await sqlQuery(
          "SELECT product_id, product_name, quantity, unit_cost, retail_price, subtotal FROM purchase_order_items WHERE po_id = ?",
          [params.id]
        );

        const items = itemsRows as unknown as {
          product_id: number;
          product_name: string | null;
          quantity: number;
          unit_cost: number;
          retail_price: number | null;
          subtotal: number;
        }[];

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);

        // Calculate discount factor
        let discountFactor = 1;
        if (
          po.discount_type &&
          po.discount_value &&
          po.discount_value > 0 &&
          subtotal > 0
        ) {
          if (po.discount_type === "percentage") {
            discountFactor = 1 - po.discount_value / 100;
          } else {
            // Amount discount - calculate proportional reduction
            discountFactor = Math.max(
              0,
              (subtotal - po.discount_value) / subtotal
            );
          }
        }

        for (const item of items) {
          const productRows = await sqlQuery(
            "SELECT cost_price, stock_quantity FROM products WHERE id = ?",
            [item.product_id]
          );

          if (productRows.length === 0) {
            continue;
          }

          const product = productRows[0] as Record<string, unknown>;
          const currentStock = Number(product.stock_quantity ?? 0);
          const currentCost = Number(product.cost_price ?? 0);
          const newQuantity = item.quantity;
          const newCost = item.unit_cost * discountFactor;

          let newCostPrice: number;
          if (currentStock > 0) {
            const totalCurrentValue = currentStock * currentCost;
            const totalNewValue = newQuantity * newCost;
            const totalQuantity = currentStock + newQuantity;
            newCostPrice = (totalCurrentValue + totalNewValue) / totalQuantity;
          } else {
            newCostPrice = newCost;
          }

          await updateProductQuantity(
            item.product_id,
            item.quantity,
            "add",
            parseInt(params.id, 10),
            "purchase"
          );

          await sqlExecute(
            "UPDATE products SET cost_price = ? WHERE id = ?",
            [roundPrice(newCostPrice), item.product_id]
          );

          if (item.retail_price !== null && item.retail_price > 0) {
            await sqlExecute(
              "UPDATE products SET selling_price = ? WHERE id = ?",
              [roundPrice(item.retail_price), item.product_id]
            );
          }

          if (item.product_name) {
            await sqlExecute(
              "UPDATE products SET name = ? WHERE id = ?",
              [item.product_name, item.product_id]
            );
          }
        }
      }

      return NextResponse.json({ purchase_order: resultRows[0] });
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

    const poCheckRows = await sqlQuery(
      "SELECT id, status FROM purchase_orders WHERE id = ?",
      [poId]
    );

    if (poCheckRows.length === 0) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    const poStatus = (poCheckRows[0] as Record<string, unknown>).status as string;

    if (poStatus === "completed") {
      const itemsRows = await sqlQuery<{ product_id: number; quantity: number }>(
        "SELECT product_id, quantity FROM purchase_order_items WHERE po_id = ?",
        [poId]
      );

      for (const item of itemsRows) {
        await updateProductQuantity(
          item.product_id,
          item.quantity,
          "subtract",
          poId,
          "purchase"
        );
      }
    }

    await sqlExecute(
      "DELETE FROM inventory_transactions WHERE reference_id = ? AND transaction_type = 'purchase'",
      [poId]
    );

    await sqlExecute(
      "DELETE FROM purchase_order_items WHERE po_id = ?",
      [poId]
    );

    await sqlExecute(
      "DELETE FROM purchase_orders WHERE id = ?",
      [poId]
    );

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

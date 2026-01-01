import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import {
  getPaginationParams,
  buildPaginationResponse,
  handleApiError,
  handleValidationError,
  roundPrice,
} from "@/lib/utils/apiHelpers";
import { updateProductQuantity } from "@/lib/utils/productQuantity";

const saleSchema = z.object({
  customer_id: z.number().optional(),
  items: z.array(
    z.object({
      product_id: z.number(),
      quantity: z.number().min(0.001), // Allow decimal quantities down to 0.001
      unit_price: z.number().min(0),
      discount: z.number().min(0).optional(),
    })
  ),
  return_items: z
    .array(
      z.object({
        sale_id: z.number().optional(),
        sale_item_id: z.number().optional(),
        product_id: z.number(),
        quantity: z.number().min(0.001),
        unit_price: z.number().min(0),
        cost_price: z.number().min(0).optional(),
      })
    )
    .optional(),
  discount_amount: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  payment_method: z.enum(["cash", "card", "digital"]),
  amount_paid: z.number().min(0).optional(), // For partial/credit payments
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const search = searchParams.get("search");
    const { page, limit, offset } = getPaginationParams(req);

    // Optimized query: Calculate net profit (after returns) using subquery
    let sql = `
      SELECT s.*, 
             u.username as user_name, 
             c.name as customer_name,
             c.phone as customer_phone,
             COALESCE(
               (SELECT SUM((si.unit_price - si.cost_price) * si.quantity)
                FROM sale_items si
                WHERE si.sale_id = s.id)
               -
               COALESCE(
                 (SELECT SUM((ri.unit_price - si2.cost_price) * ri.quantity)
                  FROM return_items ri
                  JOIN returns r ON ri.return_id = r.id
                  JOIN sale_items si2 ON ri.sale_item_id = si2.id
                  WHERE r.sale_id = s.id),
                 0
               ),
               0
             ) as total_profit
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (startDate) {
      // Use ISO 8601 datetime comparison to include the full start day (UTC)
      sql += " AND s.created_at >= ?";
      args.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      // Use ISO 8601 datetime comparison to include the full end day (UTC)
      sql += " AND s.created_at <= ?";
      args.push(`${endDate}T23:59:59.999Z`);
    }
    if (search) {
      // Search by sale_number, customer_name, or customer_phone
      sql += " AND (s.sale_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)";
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const countArgs: (string | number)[] = [];
    if (startDate) {
      countSql += " AND s.created_at >= ?";
      countArgs.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      countSql += " AND s.created_at <= ?";
      countArgs.push(`${endDate}T23:59:59.999Z`);
    }
    if (search) {
      countSql +=
        " AND (s.sale_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)";
      const searchTerm = `%${search}%`;
      countArgs.push(searchTerm, searchTerm, searchTerm);
    }

    const countResult = await client.execute({
      sql: countSql,
      args: countArgs,
    });
    const total = (countResult.rows[0] as unknown as { total: number }).total;

    // Execute paginated query
    const paginatedSql = `${sql} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
    const paginatedArgs = [...args, limit, offset];
    const dataResult = await client.execute({
      sql: paginatedSql,
      args: paginatedArgs,
    });

    const pagination = buildPaginationResponse(total, page, limit);

    return NextResponse.json({
      sales: dataResult.rows,
      pagination,
    });
  } catch (error) {
    return handleApiError(error, "fetching sales");
  }
}

async function postHandler(req: AuthRequest) {
  try {
    const body = await req.json();
    const validated = saleSchema.parse(body);
    const user = req.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate sale number
    const saleNumber = `SALE-${Date.now()}`;

    // Calculate totals for regular items
    let totalAmount = 0;
    for (const item of validated.items) {
      const subtotal = roundPrice(
        item.quantity * roundPrice(item.unit_price) -
          roundPrice(item.discount || 0)
      );
      totalAmount += subtotal;
    }
    totalAmount = roundPrice(totalAmount);

    // Calculate returns total (these will be deducted)
    let returnsTotal = 0;
    if (validated.return_items && validated.return_items.length > 0) {
      for (const returnItem of validated.return_items) {
        returnsTotal += roundPrice(
          returnItem.quantity * roundPrice(returnItem.unit_price)
        );
      }
    }
    returnsTotal = roundPrice(returnsTotal);

    // Net total after returns
    const netTotalAmount = roundPrice(totalAmount - returnsTotal);

    const discountAmount = roundPrice(validated.discount_amount || 0);
    const taxAmount = roundPrice(validated.tax_amount || 0);
    const finalAmount = roundPrice(netTotalAmount - discountAmount + taxAmount);

    // Handle partial/credit payments
    const amountPaid =
      validated.amount_paid !== undefined
        ? roundPrice(Math.min(validated.amount_paid, finalAmount))
        : finalAmount;
    const creditAmount = roundPrice(finalAmount - amountPaid);

    // Determine payment status
    let paymentStatus = "completed";
    if (creditAmount > 0) {
      if (amountPaid === 0) {
        paymentStatus = "pending"; // Full credit
      } else {
        paymentStatus = "partial"; // Partial payment
      }
    }

    // Validate: credit sales require a customer
    if (creditAmount > 0 && !validated.customer_id) {
      return NextResponse.json(
        { error: "Customer is required for credit sales" },
        { status: 400 }
      );
    }

    // Create sale with explicit timestamp to avoid timezone issues
    // Use getCurrentTimestamp from dateTime utility for consistency
    const { getCurrentTimestamp } = await import("@/lib/utils/dateTime");
    const timestamp = getCurrentTimestamp();

    const saleResult = await client.execute({
      sql: `INSERT INTO sales (sale_number, customer_id, user_id, total_amount, 
            discount_amount, tax_amount, final_amount, payment_method, payment_status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        saleNumber,
        validated.customer_id || null,
        user.userId,
        netTotalAmount, // Use net amount (after returns)
        discountAmount,
        taxAmount,
        finalAmount,
        validated.payment_method,
        paymentStatus,
        timestamp,
      ],
    });

    const saleId = (saleResult.rows[0] as unknown as { id: number }).id;

    // Create sale items and update inventory
    for (const item of validated.items) {
      const roundedUnitPrice = roundPrice(item.unit_price);
      const roundedDiscount = roundPrice(item.discount || 0);
      const subtotal = roundPrice(
        item.quantity * roundedUnitPrice - roundedDiscount
      );

      // Get current cost_price from product to store with sale
      const productResult = await client.execute({
        sql: "SELECT cost_price FROM products WHERE id = ?",
        args: [item.product_id],
      });
      const costPrice =
        productResult.rows.length > 0
          ? roundPrice(
              (productResult.rows[0] as unknown as { cost_price: number })
                .cost_price || 0
            )
          : 0;

      await client.execute({
        sql: "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, cost_price, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          saleId,
          item.product_id,
          item.quantity,
          roundedUnitPrice,
          costPrice,
          roundedDiscount,
          subtotal,
        ],
      });

      // Update inventory with relationship logic
      await updateProductQuantity(
        item.product_id,
        item.quantity,
        "subtract",
        saleId,
        "sale"
      );
    }

    // Create payment record (only for amount actually paid)
    if (amountPaid > 0) {
      await client.execute({
        sql: "INSERT INTO payments (sale_id, payment_method, amount) VALUES (?, ?, ?)",
        args: [saleId, validated.payment_method, amountPaid],
      });
    }

    // Update customer's credit balance if this is a credit sale
    if (creditAmount > 0 && validated.customer_id) {
      await client.execute({
        sql: "UPDATE customers SET credit_balance = credit_balance + ?, updated_at = ? WHERE id = ?",
        args: [creditAmount, timestamp, validated.customer_id],
      });
    }

    // Process inline returns if any
    if (validated.return_items && validated.return_items.length > 0) {
      // Create a return record linked to the current sale
      const returnNumber = `RET-${Date.now()}`;

      const returnResult = await client.execute({
        sql: `INSERT INTO returns (return_number, sale_id, user_id, total_amount, refund_amount, 
              refund_method, reason, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [
          returnNumber,
          saleId, // Link to the current sale being created
          user.userId,
          returnsTotal,
          0, // Refund amount is 0 since it's applied to the new sale
          "store_credit", // Applied as credit to new purchase
          "Inline return with new purchase",
          timestamp,
        ],
      });

      const returnId = (returnResult.rows[0] as unknown as { id: number }).id;

      // Create return items and restore inventory
      for (const returnItem of validated.return_items) {
        let costPrice = returnItem.cost_price || 0;

        // If linked to a sale item, get cost_price from original sale_item
        if (returnItem.sale_item_id) {
          const originalSaleItemResult = await client.execute({
            sql: "SELECT cost_price FROM sale_items WHERE id = ?",
            args: [returnItem.sale_item_id],
          });
          if (originalSaleItemResult.rows.length > 0) {
            costPrice = roundPrice(
              (
                originalSaleItemResult.rows[0] as unknown as {
                  cost_price: number;
                }
              ).cost_price || costPrice
            );
          }
        } else if (!costPrice) {
          // For generic returns without cost_price, get from product
          const productResult = await client.execute({
            sql: "SELECT cost_price FROM products WHERE id = ?",
            args: [returnItem.product_id],
          });
          if (productResult.rows.length > 0) {
            costPrice = roundPrice(
              (productResult.rows[0] as unknown as { cost_price: number })
                .cost_price || 0
            );
          }
        }

        const refundAmount = roundPrice(
          returnItem.quantity * roundPrice(returnItem.unit_price)
        );

        await client.execute({
          sql: `INSERT INTO return_items (return_id, sale_item_id, product_id, quantity, 
                unit_price, refund_amount) VALUES (?, ?, ?, ?, ?, ?)`,
          args: [
            returnId,
            returnItem.sale_item_id || null, // May be null for generic returns
            returnItem.product_id,
            returnItem.quantity,
            roundPrice(returnItem.unit_price),
            refundAmount,
          ],
        });

        // Restore inventory for returned items
        await updateProductQuantity(
          returnItem.product_id,
          returnItem.quantity,
          "add",
          returnId,
          "return"
        );
      }
    }

    // Get full sale details
    const fullSaleResult = await client.execute({
      sql: `SELECT s.*, u.username as user_name, c.name as customer_name, c.phone as customer_phone
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.id = ?`,
      args: [saleId],
    });

    // Get sale items with product details (use LEFT JOIN to handle deleted products)
    // Use stored cost_price from sale_items instead of current product cost_price
    const saleItemsResult = await client.execute({
      sql: `SELECT si.*, 
                   COALESCE(p.name, 'Deleted Product') as product_name, 
                   p.barcode
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
            ORDER BY si.id`,
      args: [saleId],
    });

    return NextResponse.json(
      {
        sale: fullSaleResult.rows[0],
        items: saleItemsResult.rows,
      },
      { status: 201 }
    );
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating sale");
  }
}

async function deleteHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      // Delete all related records first to avoid foreign key constraints
      // Delete return items
      await client.execute(`
        DELETE FROM return_items 
        WHERE return_id IN (SELECT id FROM returns)
      `);

      // Delete inventory transactions for returns
      await client.execute(`
        DELETE FROM inventory_transactions 
        WHERE transaction_type = 'return'
      `);

      // Delete returns
      await client.execute("DELETE FROM returns");

      // Delete inventory transactions for sales
      await client.execute(`
        DELETE FROM inventory_transactions 
        WHERE transaction_type = 'sale'
      `);

      // Delete payments
      await client.execute("DELETE FROM payments");

      // Delete sale items
      await client.execute("DELETE FROM sale_items");

      // Finally delete sales
      await client.execute("DELETE FROM sales");

      return NextResponse.json({ message: "All sales deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "deleting sales");
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);

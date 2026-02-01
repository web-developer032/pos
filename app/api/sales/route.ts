import { NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { sqlQuery, sqlExecute } from "@/lib/db";
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

async function getHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const search = searchParams.get("search");
    const { page, limit, offset } = getPaginationParams(req);

    // Optimized query: Calculate net profit (after returns) using subquery; scope by user
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
      WHERE s.user_id = ?
    `;
    const args: (string | number)[] = [userId];

    if (startDate) {
      sql += " AND s.created_at >= ?";
      args.push(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
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
      WHERE s.user_id = ?
    `;
    const countArgs: (string | number)[] = [userId];
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

    const countRows = await sqlQuery<{ total: number }>(countSql, countArgs);
    const total = Number(countRows[0]?.total ?? 0);

    const paginatedSql = `${sql} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
    const paginatedArgs = [...args, limit, offset];
    const dataRows = await sqlQuery(paginatedSql, paginatedArgs);

    const pagination = buildPaginationResponse(total, page, limit);

    return NextResponse.json({
      sales: dataRows,
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

    // Cross-check: customer must belong to current user
    if (validated.customer_id) {
      const customerRows = await sqlQuery(
        "SELECT id FROM customers WHERE id = ? AND user_id = ?",
        [validated.customer_id, user.userId]
      );
      if (customerRows.length === 0) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
    }

    // Create sale with explicit timestamp to avoid timezone issues
    // Use getCurrentTimestamp from dateTime utility for consistency
    const { getCurrentTimestamp } = await import("@/lib/utils/dateTime");
    const timestamp = getCurrentTimestamp();

    const saleRows = await sqlQuery<{ id: number }>(
      `INSERT INTO sales (sale_number, customer_id, user_id, total_amount, 
            discount_amount, tax_amount, final_amount, payment_method, payment_status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        saleNumber,
        validated.customer_id || null,
        user.userId,
        netTotalAmount,
        discountAmount,
        taxAmount,
        finalAmount,
        validated.payment_method,
        paymentStatus,
        timestamp,
      ]
    );

    const saleId = saleRows[0].id;

    for (const item of validated.items) {
      const roundedUnitPrice = roundPrice(item.unit_price);
      const roundedDiscount = roundPrice(item.discount || 0);
      const subtotal = roundPrice(
        item.quantity * roundedUnitPrice - roundedDiscount
      );

      const productRows = await sqlQuery<{ cost_price: number }>(
        "SELECT cost_price FROM products WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
        [item.product_id, user.userId]
      );
      if (productRows.length === 0) {
        return NextResponse.json(
          { error: `Product ${item.product_id} not found or does not belong to you` },
          { status: 400 }
        );
      }
      const costPrice = roundPrice(Number(productRows[0]?.cost_price ?? 0));

      await sqlExecute(
        "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, cost_price, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          saleId,
          item.product_id,
          item.quantity,
          roundedUnitPrice,
          costPrice,
          roundedDiscount,
          subtotal,
        ]
      );

      // Update inventory with relationship logic
      await updateProductQuantity(
        item.product_id,
        item.quantity,
        "subtract",
        saleId,
        "sale"
      );
    }

    if (amountPaid > 0) {
      await sqlExecute(
        "INSERT INTO payments (sale_id, payment_method, amount) VALUES (?, ?, ?)",
        [saleId, validated.payment_method, amountPaid]
      );
    }

    if (creditAmount > 0 && validated.customer_id) {
      await sqlExecute(
        "UPDATE customers SET credit_balance = credit_balance + ?, updated_at = ? WHERE id = ? AND user_id = ?",
        [creditAmount, timestamp, validated.customer_id, user.userId]
      );
    }

    if (validated.return_items && validated.return_items.length > 0) {
      const returnNumber = `RET-${Date.now()}`;

      const returnRows = await sqlQuery<{ id: number }>(
        `INSERT INTO returns (return_number, sale_id, user_id, total_amount, refund_amount, 
              refund_method, reason, created_at) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [
          returnNumber,
          saleId,
          user.userId,
          returnsTotal,
          0,
          "store_credit",
          "Inline return with new purchase",
          timestamp,
        ]
      );

      const returnId = returnRows[0].id;

      for (const returnItem of validated.return_items) {
        let costPrice = returnItem.cost_price ?? 0;

        if (returnItem.sale_item_id) {
          const originalRows = await sqlQuery<{ cost_price: number }>(
            "SELECT cost_price FROM sale_items WHERE id = ?",
            [returnItem.sale_item_id]
          );
          if (originalRows.length > 0) {
            costPrice = roundPrice(Number(originalRows[0]?.cost_price ?? costPrice));
          }
        } else if (!costPrice) {
          const productRows = await sqlQuery<{ cost_price: number }>(
            "SELECT cost_price FROM products WHERE id = ? AND user_id = ?",
            [returnItem.product_id, user.userId]
          );
          if (productRows.length > 0) {
            costPrice = roundPrice(Number(productRows[0]?.cost_price ?? 0));
          }
        }

        const refundAmount = roundPrice(
          returnItem.quantity * roundPrice(returnItem.unit_price)
        );

        await sqlExecute(
          `INSERT INTO return_items (return_id, sale_item_id, product_id, quantity, 
                unit_price, refund_amount) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            returnId,
            returnItem.sale_item_id ?? null,
            returnItem.product_id,
            returnItem.quantity,
            roundPrice(returnItem.unit_price),
            refundAmount,
          ]
        );

        await updateProductQuantity(
          returnItem.product_id,
          returnItem.quantity,
          "add",
          returnId,
          "return"
        );
      }
    }

    const fullSaleRows = await sqlQuery(
      `SELECT s.*, u.username as user_name, c.name as customer_name, c.phone as customer_phone
            FROM sales s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.id = ? AND s.user_id = ?`,
      [saleId, user.userId]
    );

    const saleItemsRows = await sqlQuery(
      `SELECT si.*, 
                   COALESCE(p.name, 'Deleted Product') as product_name, 
                   p.barcode
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = ?
            ORDER BY si.id`,
      [saleId]
    );

    return NextResponse.json(
      {
        sale: fullSaleRows[0],
        items: saleItemsRows,
      },
      { status: 201 }
    );
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating sale");
  }
}

async function deleteHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      await sqlExecute(
        `DELETE FROM return_items WHERE return_id IN (SELECT id FROM returns WHERE user_id = ?)`,
        [userId]
      );
      await sqlExecute(
        `DELETE FROM inventory_transactions WHERE transaction_type = 'return' AND reference_id IN (SELECT id FROM returns WHERE user_id = ?)`,
        [userId]
      );
      await sqlExecute("DELETE FROM returns WHERE user_id = ?", [userId]);
      await sqlExecute(
        `DELETE FROM inventory_transactions WHERE transaction_type = 'sale' AND reference_id IN (SELECT id FROM sales WHERE user_id = ?)`,
        [userId]
      );
      await sqlExecute(
        "DELETE FROM payments WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ?)",
        [userId]
      );
      await sqlExecute(
        "DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id = ?)",
        [userId]
      );
      await sqlExecute("DELETE FROM sales WHERE user_id = ?", [userId]);

      return NextResponse.json({ message: "All sales deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "deleting sales");
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "sales" });
export const POST = requireAuth(postHandler, { requiredFeature: "sales" });
export const DELETE = requireAuth(deleteHandler, { requiredFeature: "sales" });

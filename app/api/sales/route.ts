import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import {
  getPaginationParams,
  buildPaginationResponse,
  handleApiError,
  handleValidationError,
} from "@/lib/utils/apiHelpers";

const saleSchema = z.object({
  customer_id: z.number().optional(),
  items: z.array(
    z.object({
      product_id: z.number(),
      quantity: z.number().min(0.01), // Allow decimal quantities
      unit_price: z.number().min(0),
      discount: z.number().min(0).optional(),
    })
  ),
  discount_amount: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  payment_method: z.enum(["cash", "card", "digital"]),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const { page, limit, offset } = getPaginationParams(req);

    // Optimized query: Calculate profit using subquery for better performance
    let sql = `
      SELECT s.*, 
             u.username as user_name, 
             c.name as customer_name,
             COALESCE(
               (SELECT SUM((si.unit_price - si.cost_price) * si.quantity)
                FROM sale_items si
                WHERE si.sale_id = s.id),
               0
             ) as total_profit
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (startDate) {
      // Use datetime comparison to include the full start day
      // Format: "YYYY-MM-DD" -> "YYYY-MM-DD 00:00:00"
      sql += " AND s.created_at >= ?";
      args.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      // Use datetime comparison to include the full end day
      // Format: "YYYY-MM-DD" -> "YYYY-MM-DD 23:59:59"
      sql += " AND s.created_at <= ?";
      args.push(`${endDate} 23:59:59`);
    }

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM sales s
      WHERE 1=1
      ${startDate ? "AND s.created_at >= ?" : ""}
      ${endDate ? "AND s.created_at <= ?" : ""}
    `;
    const countArgs: (string | number)[] = [];
    if (startDate) countArgs.push(`${startDate} 00:00:00`);
    if (endDate) countArgs.push(`${endDate} 23:59:59`);

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

    // Calculate totals
    let totalAmount = 0;
    for (const item of validated.items) {
      const subtotal = item.quantity * item.unit_price - (item.discount || 0);
      totalAmount += subtotal;
    }

    const discountAmount = validated.discount_amount || 0;
    const taxAmount = validated.tax_amount || 0;
    const finalAmount = totalAmount - discountAmount + taxAmount;

    // Create sale with explicit timestamp to avoid timezone issues
    // Use getCurrentTimestamp from dateTime utility for consistency
    const { getCurrentTimestamp } = await import("@/lib/utils/dateTime");
    const timestamp = getCurrentTimestamp();

    const saleResult = await client.execute({
      sql: `INSERT INTO sales (sale_number, customer_id, user_id, total_amount, 
            discount_amount, tax_amount, final_amount, payment_method, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        saleNumber,
        validated.customer_id || null,
        user.userId,
        totalAmount,
        discountAmount,
        taxAmount,
        finalAmount,
        validated.payment_method,
        timestamp,
      ],
    });

    const saleId = (saleResult.rows[0] as unknown as { id: number }).id;

    // Create sale items and update inventory
    for (const item of validated.items) {
      const subtotal = item.quantity * item.unit_price - (item.discount || 0);

      // Get current cost_price from product to store with sale
      const productResult = await client.execute({
        sql: "SELECT cost_price FROM products WHERE id = ?",
        args: [item.product_id],
      });
      const costPrice =
        productResult.rows.length > 0
          ? (productResult.rows[0] as unknown as { cost_price: number })
              .cost_price || 0
          : 0;

      await client.execute({
        sql: "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, cost_price, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          saleId,
          item.product_id,
          item.quantity,
          item.unit_price,
          costPrice,
          item.discount || 0,
          subtotal,
        ],
      });

      // Update inventory
      await client.execute({
        sql: "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
        args: [item.quantity, item.product_id],
      });

      // Record inventory transaction
      await client.execute({
        sql: "INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_id) VALUES (?, ?, ?, ?)",
        args: [item.product_id, "sale", item.quantity, saleId],
      });
    }

    // Create payment record
    await client.execute({
      sql: "INSERT INTO payments (sale_id, payment_method, amount) VALUES (?, ?, ?)",
      args: [saleId, validated.payment_method, finalAmount],
    });

    // Get full sale details
    const fullSaleResult = await client.execute({
      sql: `SELECT s.*, u.username as user_name, c.name as customer_name
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

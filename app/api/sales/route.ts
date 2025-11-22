import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const saleSchema = z.object({
  customer_id: z.number().optional(),
  items: z.array(
    z.object({
      product_id: z.number(),
      quantity: z.number().int().min(1),
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

    let sql = `
      SELECT s.*, u.username as user_name, c.name as customer_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (startDate) {
      sql += " AND DATE(s.created_at) >= ?";
      args.push(startDate);
    }
    if (endDate) {
      sql += " AND DATE(s.created_at) <= ?";
      args.push(endDate);
    }

    // Get total count
    const countSql = sql.replace(
      /SELECT s\.\*, u\.username as user_name, c\.name as customer_name/,
      "SELECT COUNT(*) as total"
    );
    const countResult = await client.execute({ sql: countSql, args });
    const total = (countResult.rows[0] as any).total as number;

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = (page - 1) * limit;

    sql += " ORDER BY s.created_at DESC LIMIT ? OFFSET ?";
    args.push(limit, offset);

    const result = await client.execute({ sql, args });
    return NextResponse.json({
      sales: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = saleSchema.parse(body);
    const user = (req as any).user;

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

    // Create sale
    const saleResult = await client.execute({
      sql: `INSERT INTO sales (sale_number, customer_id, user_id, total_amount, 
            discount_amount, tax_amount, final_amount, payment_method) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        saleNumber,
        validated.customer_id || null,
        user.userId,
        totalAmount,
        discountAmount,
        taxAmount,
        finalAmount,
        validated.payment_method,
      ],
    });

    const saleId = (saleResult.rows[0] as any).id;

    // Create sale items and update inventory
    for (const item of validated.items) {
      const subtotal = item.quantity * item.unit_price - (item.discount || 0);

      await client.execute({
        sql: "INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?)",
        args: [
          saleId,
          item.product_id,
          item.quantity,
          item.unit_price,
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

    return NextResponse.json(
      { sale: fullSaleResult.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
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

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error deleting sales:", error);
    return NextResponse.json(
      { error: "Failed to delete sales" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);


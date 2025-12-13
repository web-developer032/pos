import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";
import { roundPrice } from "@/lib/utils/apiHelpers";
import { updateProductQuantity } from "@/lib/utils/productQuantity";

const returnSchema = z.object({
  sale_id: z.number(),
  items: z.array(
    z.object({
      sale_item_id: z.number(),
      product_id: z.number(),
      quantity: z.number().min(0.001),
      unit_price: z.number().min(0),
    })
  ),
  refund_method: z.enum(["cash", "card", "digital", "store_credit"]),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get("sale_id");

    let sql = `
      SELECT r.*, u.username as user_name, s.sale_number
      FROM returns r
      JOIN users u ON r.user_id = u.id
      JOIN sales s ON r.sale_id = s.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (saleId) {
      sql += " AND r.sale_id = ?";
      args.push(parseInt(saleId));
    }

    sql += " ORDER BY r.created_at DESC";

    const result = await client.execute({ sql, args });

    return NextResponse.json({ returns: result.rows });
  } catch (error) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}

async function postHandler(req: AuthRequest) {
  try {
    const body = await req.json();
    const validated = returnSchema.parse(body);
    const user = req.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify sale exists
    const saleCheck = await client.execute({
      sql: "SELECT id, final_amount FROM sales WHERE id = ?",
      args: [validated.sale_id],
    });

    if (saleCheck.rows.length === 0) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    // Verify sale items and check quantities
    for (const returnItem of validated.items) {
      const saleItemCheck = await client.execute({
        sql: `SELECT si.*, 
                     COALESCE(SUM(ri.quantity), 0) as already_returned
              FROM sale_items si
              LEFT JOIN return_items ri ON si.id = ri.sale_item_id
              WHERE si.id = ? AND si.sale_id = ?
              GROUP BY si.id`,
        args: [returnItem.sale_item_id, validated.sale_id],
      });

      if (saleItemCheck.rows.length === 0) {
        return NextResponse.json(
          { error: `Sale item ${returnItem.sale_item_id} not found` },
          { status: 404 }
        );
      }

      const saleItem = saleItemCheck.rows[0] as unknown as {
        quantity: number;
        already_returned: number;
      };

      const availableToReturn = saleItem.quantity - saleItem.already_returned;

      if (returnItem.quantity > availableToReturn) {
        return NextResponse.json(
          {
            error: `Cannot return ${returnItem.quantity} units. Only ${availableToReturn} units available to return.`,
          },
          { status: 400 }
        );
      }
    }

    // Generate return number
    const returnNumber = `RET-${Date.now()}`;

    // Calculate refund amount
    let totalRefund = 0;
    for (const item of validated.items) {
      totalRefund += item.quantity * roundPrice(item.unit_price);
    }
    totalRefund = roundPrice(totalRefund);

    const timestamp = getCurrentTimestamp();

    // Create return record
    const returnResult = await client.execute({
      sql: `INSERT INTO returns (return_number, sale_id, user_id, total_amount, refund_amount, refund_method, reason, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        returnNumber,
        validated.sale_id,
        user.userId,
        totalRefund,
        totalRefund,
        validated.refund_method,
        validated.reason || null,
        validated.notes || null,
        timestamp,
      ],
    });

    const returnId = (returnResult.rows[0] as unknown as { id: number }).id;

    // Create return items and restore inventory
    for (const item of validated.items) {
      const roundedUnitPrice = roundPrice(item.unit_price);
      const refundAmount = roundPrice(item.quantity * roundedUnitPrice);

      await client.execute({
        sql: `INSERT INTO return_items (return_id, sale_item_id, product_id, quantity, unit_price, refund_amount)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          returnId,
          item.sale_item_id,
          item.product_id,
          item.quantity,
          roundedUnitPrice,
          refundAmount,
        ],
      });

      // Restore inventory with relationship logic
      await updateProductQuantity(item.product_id, item.quantity, 'add', returnId, 'return');
    }

    // Get full return details
    const fullReturnResult = await client.execute({
      sql: `SELECT r.*, u.username as user_name, s.sale_number
            FROM returns r
            JOIN users u ON r.user_id = u.id
            JOIN sales s ON r.sale_id = s.id
            WHERE r.id = ?`,
      args: [returnId],
    });

    // Get return items
    const returnItemsResult = await client.execute({
      sql: `SELECT ri.*, p.name as product_name, p.barcode
            FROM return_items ri
            JOIN products p ON ri.product_id = p.id
            WHERE ri.return_id = ?`,
      args: [returnId],
    });

    return NextResponse.json(
      {
        return: fullReturnResult.rows[0],
        items: returnItemsResult.rows,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating return:", error);
    return NextResponse.json(
      { error: "Failed to create return" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);

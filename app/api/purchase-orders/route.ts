import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const poSchema = z.object({
  supplier_id: z.number(),
  items: z.array(
    z.object({
      product_id: z.number(),
      quantity: z.number().int().min(1),
      unit_cost: z.number().min(0),
    })
  ),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await client.execute(`
      SELECT COUNT(*) as total
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN users u ON po.user_id = u.id
    `);
    const total = (countResult.rows[0] as any).total as number;

    const result = await client.execute({
      sql: `
        SELECT po.*, s.name as supplier_name, u.username as user_name
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        JOIN users u ON po.user_id = u.id
        ORDER BY po.created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [limit, offset],
    });
    return NextResponse.json({
      purchase_orders: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase orders" },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = poSchema.parse(body);
    const user = (req as any).user;

    const poNumber = `PO-${Date.now()}`;
    const totalAmount = validated.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0
    );

    const poResult = await client.execute({
      sql: `INSERT INTO purchase_orders (po_number, supplier_id, user_id, total_amount) 
            VALUES (?, ?, ?, ?) RETURNING *`,
      args: [poNumber, validated.supplier_id, user.userId, totalAmount],
    });

    const poId = (poResult.rows[0] as any).id;

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

    return NextResponse.json(
      { purchase_order: poResult.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating purchase order:", error);
    return NextResponse.json(
      { error: "Failed to create purchase order" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      await client.execute("DELETE FROM purchase_orders");
      return NextResponse.json({ message: "All purchase orders deleted successfully" });
    }

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error deleting purchase orders:", error);
    return NextResponse.json(
      { error: "Failed to delete purchase orders" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);


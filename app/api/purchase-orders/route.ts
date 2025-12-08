import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import {
  getPaginationParams,
  executePaginatedQuery,
  handleApiError,
  handleValidationError,
  roundPrice,
} from "@/lib/utils/apiHelpers";

const poSchema = z.object({
  supplier_id: z.number(),
  items: z.array(
    z.object({
      product_id: z.number(),
      product_name: z.string().optional(),
      quantity: z.number().int().min(1),
      unit_cost: z.number().min(0),
      retail_price: z.number().min(0).optional(),
    })
  ),
  discount_type: z.enum(["percentage", "amount"]).optional(),
  discount_value: z.number().min(0).optional(),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const { page, limit, offset } = getPaginationParams(req);

    let sql = `
      SELECT po.*, s.name as supplier_name, u.username as user_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN users u ON po.user_id = u.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    // Add search condition
    if (search) {
      sql += ` AND (po.po_number LIKE ? OR s.name LIKE ? OR u.username LIKE ?)`;
      const searchPattern = `%${search}%`;
      args.push(searchPattern, searchPattern, searchPattern);
    }

    if (status && ["pending", "completed", "cancelled"].includes(status)) {
      sql += ` AND po.status = ?`;
      args.push(status);
    }

    const result = await executePaginatedQuery({
      baseSql: sql,
      baseArgs: args,
      orderBy: "po.created_at DESC",
      page,
      limit,
      offset,
    });

    return NextResponse.json({
      purchase_orders: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleApiError(error, "fetching purchase orders");
  }
}

async function postHandler(req: AuthRequest) {
  try {
    const body = await req.json();
    const validated = poSchema.parse(body);
    const user = req.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const poNumber = `PO-${Date.now()}`;
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

    // Use transaction to ensure atomicity - if items fail, PO header is rolled back
    await client.execute("BEGIN TRANSACTION");

    try {
      const poResult = await client.execute({
        sql: `INSERT INTO purchase_orders (po_number, supplier_id, user_id, total_amount, discount_type, discount_value) 
              VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
        args: [
          poNumber,
          validated.supplier_id,
          user.userId,
          totalAmount,
          validated.discount_type || null,
          validated.discount_value || null,
        ],
      });

      const poId = (poResult.rows[0] as unknown as { id: number }).id;

      for (const item of validated.items) {
        const roundedUnitCost = roundPrice(item.unit_cost);
        const roundedRetailPrice = item.retail_price
          ? roundPrice(item.retail_price)
          : null;
        const itemSubtotal = roundPrice(item.quantity * roundedUnitCost);
        await client.execute({
          sql: `INSERT INTO purchase_order_items (po_id, product_id, product_name, quantity, unit_cost, retail_price, subtotal) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            poId,
            item.product_id,
            item.product_name || null,
            item.quantity,
            roundedUnitCost,
            roundedRetailPrice,
            itemSubtotal,
          ],
        });
      }

      await client.execute("COMMIT");

      return NextResponse.json(
        { purchase_order: poResult.rows[0] },
        { status: 201 }
      );
    } catch (txError) {
      await client.execute("ROLLBACK");
      throw txError;
    }
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating purchase order");
  }
}

async function deleteHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      await client.execute("DELETE FROM purchase_orders");
      return NextResponse.json({
        message: "All purchase orders deleted successfully",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "deleting purchase orders");
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);

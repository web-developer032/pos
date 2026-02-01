import { NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { prisma, sqlQuery, sqlExecute } from "@/lib/db";
import { z } from "zod";
import {
  getPaginationParams,
  executePaginatedQuery,
  handleApiError,
  handleValidationError,
  roundPrice,
} from "@/lib/utils/apiHelpers";

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

const poSchema = z.object({
  supplier_id: z.number(),
  items: z.array(
    z.object({
      product_id: z.number(),
      product_name: z.string().optional(),
      quantity: z.number().min(0.001),
      unit_cost: z.number().min(0),
      retail_price: z.number().min(0).optional(),
    })
  ),
  discount_type: z.enum(["percentage", "amount"]).optional(),
  discount_value: z.number().min(0).optional(),
  tax_type: z.enum(["percentage", "amount"]).optional(),
  tax_value: z.number().min(0).optional(),
});

async function getHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const { page, limit, offset } = getPaginationParams(req);

    let sql = `
      SELECT po.*, s.name as supplier_name, u.username as user_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id AND s.user_id = ?
      JOIN users u ON po.user_id = u.id
      WHERE po.user_id = ?
    `;
    const args: (string | number)[] = [userId, userId];

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

    // Calculate summary totals (for all matching POs, not just current page)
    let summarySql = `
      SELECT 
        COALESCE(SUM(CASE WHEN po.status = 'completed' THEN po.total_amount ELSE 0 END), 0) as total_completed,
        COALESCE(SUM(CASE WHEN po.status = 'pending' THEN po.total_amount ELSE 0 END), 0) as total_pending,
        COALESCE(SUM(po.total_amount), 0) as grand_total
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id AND s.user_id = ?
      JOIN users u ON po.user_id = u.id
      WHERE po.user_id = ?
    `;
    const summaryArgs: (string | number)[] = [userId, userId];

    if (search) {
      summarySql += ` AND (po.po_number LIKE ? OR s.name LIKE ? OR u.username LIKE ?)`;
      const searchPattern = `%${search}%`;
      summaryArgs.push(searchPattern, searchPattern, searchPattern);
    }

    if (status && ["pending", "completed", "cancelled"].includes(status)) {
      summarySql += ` AND po.status = ?`;
      summaryArgs.push(status);
    }

    const summaryRows = await sqlQuery(summarySql, summaryArgs);

    let paidSql = `
      SELECT COALESCE(SUM(sp.amount), 0) as total_paid
      FROM supplier_payments sp
      WHERE sp.supplier_id IN (
        SELECT DISTINCT po.supplier_id 
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id AND s.user_id = ?
        JOIN users u ON po.user_id = u.id
        WHERE po.user_id = ?
    `;
    const paidArgs: (string | number)[] = [userId, userId];

    if (search) {
      paidSql += ` AND (po.po_number LIKE ? OR s.name LIKE ? OR u.username LIKE ?)`;
      const searchPattern = `%${search}%`;
      paidArgs.push(searchPattern, searchPattern, searchPattern);
    }

    if (status && ["pending", "completed", "cancelled"].includes(status)) {
      paidSql += ` AND po.status = ?`;
      paidArgs.push(status);
    }

    paidSql += `)`;

    const paidRows = await sqlQuery(paidSql, paidArgs);

    const summary = summaryRows[0] as Record<string, unknown>;
    const paidRow = paidRows[0] as Record<string, unknown> | undefined;
    const totalPaid = Number(paidRow?.total_paid ?? 0);

    return NextResponse.json({
      purchase_orders: result.data,
      pagination: result.pagination,
      summary: {
        total_completed: Number(summary?.total_completed ?? 0),
        total_pending: Number(summary?.total_pending ?? 0),
        grand_total: Number(summary?.grand_total ?? 0),
        total_paid: totalPaid,
        outstanding: Number(summary?.total_completed ?? 0) - totalPaid,
      },
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

    // Cross-check: supplier and products must belong to current user
    const supplier = await prisma.supplier.findFirst({
      where: { id: validated.supplier_id, userId: user.userId },
    });
    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }
    for (const item of validated.items) {
      const product = await prisma.product.findFirst({
        where: { id: item.product_id, userId: user.userId, deletedAt: null },
      });
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.product_id} not found or does not belong to you` },
          { status: 400 }
        );
      }
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

    // Calculate tax (applied to subtotal after discount)
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

    const purchase_order = await prisma.$transaction(
      async (tx: TransactionClient) => {
        const po = await tx.purchaseOrder.create({
          data: {
            poNumber,
            supplierId: validated.supplier_id,
            userId: user.userId,
            totalAmount,
            discountType: validated.discount_type ?? undefined,
            discountValue: validated.discount_value ?? undefined,
            taxType: validated.tax_type ?? undefined,
            taxValue: validated.tax_value ?? undefined,
          },
        });

        await tx.purchaseOrderItem.createMany({
          data: validated.items.map((item) => {
            const roundedUnitCost = roundPrice(item.unit_cost);
            const roundedRetailPrice = item.retail_price
              ? roundPrice(item.retail_price)
              : null;
            const itemSubtotal = roundPrice(item.quantity * roundedUnitCost);
            return {
              poId: po.id,
              productId: item.product_id,
              productName: item.product_name ?? null,
              quantity: item.quantity,
              unitCost: roundedUnitCost,
              retailPrice: roundedRetailPrice,
              subtotal: itemSubtotal,
            };
          }),
        });

        return po;
      }
    );

    const poWithId = purchase_order as unknown as { id: number };
    const fullPo = await prisma.purchaseOrder.findUnique({
      where: { id: poWithId.id },
      include: { supplier: true, user: { select: { username: true } } },
    });

    const row = fullPo
      ? {
          ...fullPo,
          supplier_name: fullPo.supplier.name,
          user_name: fullPo.user.username,
        }
      : purchase_order;

    return NextResponse.json({ purchase_order: row }, { status: 201 });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating purchase order");
  }
}

async function deleteHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      await sqlExecute("DELETE FROM purchase_orders WHERE user_id = ?", [userId]);
      return NextResponse.json({
        message: "All purchase orders deleted successfully",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "deleting purchase orders");
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "purchase_orders" });
export const POST = requireAuth(postHandler, { requiredFeature: "purchase_orders" });
export const DELETE = requireAuth(deleteHandler, { requiredFeature: "purchase_orders" });

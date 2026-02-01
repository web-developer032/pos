import { NextResponse } from "next/server";
import { requireAuth, RouteContext, AuthRequest } from "@/lib/middleware/auth";
import { sqlQuery, sqlExecute } from "@/lib/db";
import { z } from "zod";

const updatePaymentSchema = z.object({
  purchase_order_id: z.number().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.enum(["cash", "bank_transfer", "check", "other"]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

async function getHandler(req: Request, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const supplierId = parseInt(params.id);
    const paymentId = parseInt(params.paymentId);

    const rows = await sqlQuery(
      `SELECT sp.*, u.username as user_name, po.po_number
            FROM supplier_payments sp
            JOIN users u ON sp.user_id = u.id
            LEFT JOIN purchase_orders po ON sp.purchase_order_id = po.id
            WHERE sp.id = ? AND sp.supplier_id = ?`,
      [paymentId, supplierId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ payment: rows[0] });
  } catch (error) {
    console.error("Error fetching supplier payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const supplierId = parseInt(params.id);
    const paymentId = parseInt(params.paymentId);
    const body = await req.json();
    const validated = updatePaymentSchema.parse(body);

    const paymentRows = await sqlQuery(
      "SELECT id, supplier_id FROM supplier_payments WHERE id = ?",
      [paymentId]
    );

    if (paymentRows.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const payment = paymentRows[0] as unknown as { supplier_id: number };
    if (payment.supplier_id !== supplierId) {
      return NextResponse.json(
        { error: "Payment does not belong to this supplier" },
        { status: 400 }
      );
    }

    if (validated.purchase_order_id) {
      const poRows = await sqlQuery(
        "SELECT id, supplier_id FROM purchase_orders WHERE id = ?",
        [validated.purchase_order_id]
      );

      if (poRows.length === 0) {
        return NextResponse.json(
          { error: "Purchase order not found" },
          { status: 404 }
        );
      }

      const po = poRows[0] as unknown as { supplier_id: number };
      if (po.supplier_id !== supplierId) {
        return NextResponse.json(
          { error: "Purchase order does not belong to this supplier" },
          { status: 400 }
        );
      }
    }

    await sqlExecute(
      `UPDATE supplier_payments 
            SET purchase_order_id = ?, amount = ?, payment_method = ?, 
                reference_number = ?, notes = ?
            WHERE id = ?`,
      [
        validated.purchase_order_id ?? null,
        validated.amount,
        validated.payment_method,
        validated.reference_number ?? null,
        validated.notes ?? null,
        paymentId,
      ]
    );

    const updatedRows = await sqlQuery(
      `SELECT sp.*, u.username as user_name, po.po_number
            FROM supplier_payments sp
            JOIN users u ON sp.user_id = u.id
            LEFT JOIN purchase_orders po ON sp.purchase_order_id = po.id
            WHERE sp.id = ?`,
      [paymentId]
    );

    return NextResponse.json({ payment: updatedRows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating supplier payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: Request, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const supplierId = parseInt(params.id);
    const paymentId = parseInt(params.paymentId);

    const paymentRows = await sqlQuery(
      "SELECT id, supplier_id FROM supplier_payments WHERE id = ?",
      [paymentId]
    );

    if (paymentRows.length === 0) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const payment = paymentRows[0] as unknown as { supplier_id: number };
    if (payment.supplier_id !== supplierId) {
      return NextResponse.json(
        { error: "Payment does not belong to this supplier" },
        { status: 400 }
      );
    }

    await sqlExecute("DELETE FROM supplier_payments WHERE id = ?", [paymentId]);

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting supplier payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "suppliers" });
export const PUT = requireAuth(putHandler, { requiredFeature: "suppliers" });
export const DELETE = requireAuth(deleteHandler, { requiredFeature: "suppliers" });


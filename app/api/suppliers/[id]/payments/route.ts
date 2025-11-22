import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const paymentSchema = z.object({
  purchase_order_id: z.number().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  payment_method: z.enum(["cash", "bank_transfer", "check", "other"]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

async function postHandler(req: AuthRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const supplierId = parseInt(params.id);
    const body = await req.json();
    const validated = paymentSchema.parse(body);
    const user = req.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify supplier exists
    const supplierCheck = await client.execute({
      sql: "SELECT id FROM suppliers WHERE id = ?",
      args: [supplierId],
    });

    if (supplierCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // If purchase_order_id is provided, verify it exists and belongs to this supplier
    if (validated.purchase_order_id) {
      const poCheck = await client.execute({
        sql: "SELECT id, supplier_id FROM purchase_orders WHERE id = ?",
        args: [validated.purchase_order_id],
      });

      if (poCheck.rows.length === 0) {
        return NextResponse.json(
          { error: "Purchase order not found" },
          { status: 404 }
        );
      }

      const po = poCheck.rows[0] as unknown as { supplier_id: number };
      if (po.supplier_id !== supplierId) {
        return NextResponse.json(
          { error: "Purchase order does not belong to this supplier" },
          { status: 400 }
        );
      }
    }

    // Insert payment
    const result = await client.execute({
      sql: `INSERT INTO supplier_payments 
            (supplier_id, purchase_order_id, amount, payment_method, reference_number, notes, user_id)
            VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        supplierId,
        validated.purchase_order_id || null,
        validated.amount,
        validated.payment_method,
        validated.reference_number || null,
        validated.notes || null,
        user.userId,
      ],
    });

    return NextResponse.json(
      { payment: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating supplier payment:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(postHandler);


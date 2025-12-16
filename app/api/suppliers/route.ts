import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";

const supplierSchema = z.object({
  name: z.string().min(1),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await client.execute(
      "SELECT COUNT(*) as total FROM suppliers"
    );
    const total = (countResult.rows[0] as unknown as { total: number }).total;

    const result = await client.execute({
      sql: "SELECT * FROM suppliers ORDER BY name LIMIT ? OFFSET ?",
      args: [limit, offset],
    });

    // Calculate ledger summary for each supplier
    const suppliersWithLedger = await Promise.all(
      result.rows.map(async (supplier) => {
        const supplierData = supplier as unknown as { id: number };

        // Get total purchases (only completed POs)
        const purchasesResult = await client.execute({
          sql: `SELECT COALESCE(SUM(total_amount), 0) as total_purchases
                FROM purchase_orders
                WHERE supplier_id = ? AND status = 'completed'`,
          args: [supplierData.id],
        });
        const totalPurchases =
          (purchasesResult.rows[0] as unknown as { total_purchases: number })
            .total_purchases || 0;

        // Get total payments
        const paymentsResult = await client.execute({
          sql: `SELECT COALESCE(SUM(amount), 0) as total_paid
                FROM supplier_payments
                WHERE supplier_id = ?`,
          args: [supplierData.id],
        });
        const totalPaid =
          (paymentsResult.rows[0] as unknown as { total_paid: number })
            .total_paid || 0;

        const balance = totalPurchases - totalPaid;

        return {
          ...supplier,
          total_purchases: totalPurchases,
          total_paid: totalPaid,
          balance: balance,
        };
      })
    );

    return NextResponse.json({
      suppliers: suppliersWithLedger,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = supplierSchema.parse(body);

    const result = await client.execute({
      sql: "INSERT INTO suppliers (name, contact_person, email, phone, address, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
      args: [
        validated.name,
        validated.contact_person || null,
        validated.email || null,
        validated.phone || null,
        validated.address || null,
        getCurrentTimestamp(),
      ],
    });

    return NextResponse.json({ supplier: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating supplier:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      await client.execute("DELETE FROM suppliers");
      return NextResponse.json({
        message: "All suppliers deleted successfully",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error deleting suppliers:", error);
    return NextResponse.json(
      { error: "Failed to delete suppliers" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);

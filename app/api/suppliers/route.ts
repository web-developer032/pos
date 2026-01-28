import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { sqlQuery, sqlExecute } from "@/lib/db";
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
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    // Build search condition
    const searchCondition = search
      ? "WHERE name LIKE ? OR contact_person LIKE ? OR phone LIKE ?"
      : "";
    const searchArgs = search
      ? [`%${search}%`, `%${search}%`, `%${search}%`]
      : [];

    const countSql = `SELECT COUNT(*)::bigint as total FROM suppliers ${searchCondition || "WHERE 1=1"}`;
    const countRows = await sqlQuery<{ total: number }>(countSql, searchArgs);
    const total = Number(countRows[0]?.total ?? 0);

    const dataSql = `SELECT * FROM suppliers ${searchCondition || "WHERE 1=1"} ORDER BY name LIMIT ? OFFSET ?`;
    const resultRows = await sqlQuery(dataSql, [...searchArgs, limit, offset]);

    const suppliersWithLedger = await Promise.all(
      resultRows.map(async (supplier) => {
        const supplierData = supplier as unknown as { id: number };

        const purchasesRows = await sqlQuery<{ total_purchases: number }>(
          `SELECT COALESCE(SUM(total_amount), 0) as total_purchases
                FROM purchase_orders
                WHERE supplier_id = ? AND status = 'completed'`,
          [supplierData.id]
        );
        const totalPurchases = Number(purchasesRows[0]?.total_purchases ?? 0);

        const paymentsRows = await sqlQuery<{ total_paid: number }>(
          `SELECT COALESCE(SUM(amount), 0) as total_paid
                FROM supplier_payments
                WHERE supplier_id = ?`,
          [supplierData.id]
        );
        const totalPaid = Number(paymentsRows[0]?.total_paid ?? 0);

        const balance = totalPurchases - totalPaid;

        return {
          ...(supplier as Record<string, unknown>),
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

    const rows = await sqlQuery(
      "INSERT INTO suppliers (name, contact_person, email, phone, address, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
      [
        validated.name,
        validated.contact_person || null,
        validated.email || null,
        validated.phone || null,
        validated.address || null,
        getCurrentTimestamp(),
      ]
    );

    return NextResponse.json({ supplier: rows[0] }, { status: 201 });
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
      await sqlExecute("DELETE FROM suppliers", []);
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

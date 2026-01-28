import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import { sqlQuery } from "@/lib/db";

async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const supplierId = parseInt(params.id);

    const purchaseOrdersRows = await sqlQuery(
      `SELECT po.*, u.username as user_name
            FROM purchase_orders po
            JOIN users u ON po.user_id = u.id
            WHERE po.supplier_id = ?
            ORDER BY po.created_at DESC`,
      [supplierId]
    );

    const paymentsRows = await sqlQuery(
      `SELECT sp.*, u.username as user_name, po.po_number
            FROM supplier_payments sp
            JOIN users u ON sp.user_id = u.id
            LEFT JOIN purchase_orders po ON sp.purchase_order_id = po.id
            WHERE sp.supplier_id = ?
            ORDER BY sp.created_at DESC`,
      [supplierId]
    );

    const totalPurchases = purchaseOrdersRows.reduce<number>((sum, po) => {
      const poData = po as unknown as { total_amount: number; status: string };
      if (poData.status === "completed") {
        return sum + (poData.total_amount || 0);
      }
      return sum;
    }, 0);

    const totalPaid = paymentsRows.reduce<number>(
      (sum, payment) =>
        sum + Number((payment as Record<string, unknown>).amount ?? 0),
      0
    );

    const balance = totalPurchases - totalPaid;

    return NextResponse.json({
      purchase_orders: purchaseOrdersRows,
      payments: paymentsRows,
      summary: {
        total_purchases: totalPurchases,
        total_paid: totalPaid,
        balance: balance,
      },
    });
  } catch (error) {
    console.error("Error fetching supplier ledger:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier ledger" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, RouteContext } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function getHandler(req: NextRequest, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const supplierId = parseInt(params.id);

    // Get all purchase orders for this supplier
    const purchaseOrdersResult = await client.execute({
      sql: `SELECT po.*, u.username as user_name
            FROM purchase_orders po
            JOIN users u ON po.user_id = u.id
            WHERE po.supplier_id = ?
            ORDER BY po.created_at DESC`,
      args: [supplierId],
    });

    // Get all payments for this supplier
    const paymentsResult = await client.execute({
      sql: `SELECT sp.*, u.username as user_name, po.po_number
            FROM supplier_payments sp
            JOIN users u ON sp.user_id = u.id
            LEFT JOIN purchase_orders po ON sp.purchase_order_id = po.id
            WHERE sp.supplier_id = ?
            ORDER BY sp.created_at DESC`,
      args: [supplierId],
    });

    // Calculate totals (only count completed purchase orders)
    const totalPurchases = purchaseOrdersResult.rows.reduce((sum, po) => {
      const poData = po as unknown as { total_amount: number; status: string };
      if (poData.status === "completed") {
        return sum + (poData.total_amount || 0);
      }
      return sum;
    }, 0);

    const totalPaid = paymentsResult.rows.reduce(
      (sum, payment) =>
        sum + ((payment as unknown as { amount: number }).amount || 0),
      0
    );

    const balance = totalPurchases - totalPaid;

    return NextResponse.json({
      purchase_orders: purchaseOrdersResult.rows,
      payments: paymentsResult.rows,
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

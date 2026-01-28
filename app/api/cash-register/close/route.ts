import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  serializeSession,
  SessionRow,
} from "@/lib/utils/cashRegisterHelpers";

export const dynamic = "force-dynamic";

const closeSessionSchema = z.object({
  closing_balance: z.number().min(0, "Closing balance must be non-negative"),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = closeSessionSchema.parse(body);

    const session = await prisma.cashRegisterSession.findFirst({
      where: { status: "open" },
    });
    if (!session) {
      return NextResponse.json(
        { error: "No open session found to close" },
        { status: 400 }
      );
    }

    const openedAt = session.openedAt;

    const [cashSalesAgg, cashRefundsAgg, cashExpensesAgg] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          paymentMethod: "cash",
          createdAt: { gte: openedAt },
        },
        _sum: { finalAmount: true },
      }),
      prisma.return.aggregate({
        where: {
          refundMethod: "cash",
          createdAt: { gte: openedAt },
        },
        _sum: { refundAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          paymentMethod: "cash",
          createdAt: { gte: openedAt },
        },
        _sum: { amount: true },
      }),
    ]);

    const cashSales = Number(cashSalesAgg._sum.finalAmount ?? 0);
    const cashRefunds = Number(cashRefundsAgg._sum.refundAmount ?? 0);
    const cashExpenses = Number(cashExpensesAgg._sum.amount ?? 0);
    const expectedBalance =
      session.openingBalance + cashSales - cashRefunds - cashExpenses;
    const variance = validatedData.closing_balance - expectedBalance;

    const updated = await prisma.cashRegisterSession.update({
      where: { id: session.id },
      data: {
        closingBalance: validatedData.closing_balance,
        expectedBalance,
        variance,
        status: "closed",
        closedAt: new Date(),
        notes: validatedData.notes ?? session.notes,
      },
      include: { user: { select: { username: true } } },
    });

    const row: SessionRow = {
      id: updated.id,
      user_id: updated.userId,
      opening_balance: updated.openingBalance,
      closing_balance: updated.closingBalance,
      expected_balance: updated.expectedBalance,
      variance: updated.variance,
      status: updated.status,
      opened_at: updated.openedAt.toISOString(),
      closed_at: updated.closedAt?.toISOString() ?? null,
      notes: updated.notes,
      user_name: updated.user?.username ?? null,
    };

    return NextResponse.json({
      message: "Day closed successfully",
      session: serializeSession(row),
      summary: {
        opening_balance: session.openingBalance,
        cash_sales: cashSales,
        cash_refunds: cashRefunds,
        cash_expenses: cashExpenses,
        expected_balance: expectedBalance,
        closing_balance: validatedData.closing_balance,
        variance,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error closing session:", error);
    return NextResponse.json(
      { error: "Failed to close session" },
      { status: 500 }
    );
  }
}

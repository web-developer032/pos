import { NextResponse } from "next/server";
import { requireAuth, RouteContext, AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId, whereUserId } from "@/lib/auth/requestContext";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateExpenseSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  payment_method: z.enum(["cash", "card", "bank_transfer", "other"]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

function toExpenseResponse(e: { id: number; amount: number; category: string; description: string | null; paymentMethod: string; referenceNumber: string | null; notes: string | null; userId: number; createdAt: Date; user?: { username: string } | null }) {
  const { user, ...rest } = e;
  return {
    id: rest.id,
    amount: rest.amount,
    category: rest.category,
    description: rest.description,
    payment_method: rest.paymentMethod,
    reference_number: rest.referenceNumber,
    notes: rest.notes,
    user_id: rest.userId,
    created_at: rest.createdAt,
    user_name: user?.username ?? null,
  };
}

async function getHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const userId = getCurrentUserId(req);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const expense = await prisma.expense.findFirst({
      where: { id, ...whereUserId(userId) },
      include: { user: { select: { username: true } } },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ expense: toExpenseResponse(expense) });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const userId = getCurrentUserId(req);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const validated = updateExpenseSchema.parse(body);

    const existing = await prisma.expense.findFirst({ where: { id, ...whereUserId(userId) } });
    if (!existing) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    await prisma.expense.updateMany({
      where: { id, ...whereUserId(userId) },
      data: {
        amount: validated.amount,
        category: validated.category,
        description: validated.description ?? null,
        paymentMethod: validated.payment_method,
        referenceNumber: validated.reference_number ?? null,
        notes: validated.notes ?? null,
      },
    });

    const expense = await prisma.expense.findFirst({
      where: { id, ...whereUserId(userId) },
      include: { user: { select: { username: true } } },
    });

    return NextResponse.json({ expense: expense ? toExpenseResponse(expense) : null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const userId = getCurrentUserId(req);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await prisma.expense.findFirst({ where: { id, ...whereUserId(userId) } });
    if (!existing) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      );
    }

    await prisma.expense.deleteMany({ where: { id, ...whereUserId(userId) } });

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, { requiredFeature: "finance" });
export const PUT = requireAuth(putHandler, { requiredFeature: "finance" });
export const DELETE = requireAuth(deleteHandler, { requiredFeature: "finance" });

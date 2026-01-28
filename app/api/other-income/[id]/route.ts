import { NextResponse } from "next/server";
import { requireAuth, AuthRequest, RouteContext } from "@/lib/middleware/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { handleApiError, handleValidationError } from "@/lib/utils/apiHelpers";

const updateSchema = z.object({
  amount: z.number().min(0.01).optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  payment_method: z.enum(["cash", "card", "bank_transfer", "other"]).optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

function toIncomeResponse(o: { id: number; amount: number; category: string; description: string | null; paymentMethod: string; referenceNumber: string | null; notes: string | null; userId: number; createdAt: Date; user?: { username: string } | null }) {
  const { user, ...rest } = o;
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
    const { id } = await context!.params;
    const incomeId = parseInt(id, 10);

    if (isNaN(incomeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const income = await prisma.otherIncome.findUnique({
      where: { id: incomeId },
      include: { user: { select: { username: true } } },
    });

    if (!income) {
      return NextResponse.json(
        { error: "Other income record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ income: toIncomeResponse(income) });
  } catch (error) {
    return handleApiError(error, "fetching other income");
  }
}

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const incomeId = parseInt(id, 10);

    if (isNaN(incomeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const validated = updateSchema.parse(body);

    const existing = await prisma.otherIncome.findUnique({
      where: { id: incomeId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Other income record not found" },
        { status: 404 }
      );
    }

    const data: { amount?: number; category?: string; description?: string | null; paymentMethod?: string; referenceNumber?: string | null; notes?: string | null } = {};
    if (validated.amount !== undefined) data.amount = validated.amount;
    if (validated.category !== undefined) data.category = validated.category;
    if (validated.description !== undefined) data.description = validated.description ?? null;
    if (validated.payment_method !== undefined) data.paymentMethod = validated.payment_method;
    if (validated.reference_number !== undefined) data.referenceNumber = validated.reference_number ?? null;
    if (validated.notes !== undefined) data.notes = validated.notes ?? null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const income = await prisma.otherIncome.update({
      where: { id: incomeId },
      data,
      include: { user: { select: { username: true } } },
    });

    return NextResponse.json({ income: toIncomeResponse(income) });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "updating other income");
  }
}

async function deleteHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const incomeId = parseInt(id, 10);

    if (isNaN(incomeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = await prisma.otherIncome.findUnique({
      where: { id: incomeId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Other income record not found" },
        { status: 404 }
      );
    }

    await prisma.otherIncome.delete({
      where: { id: incomeId },
    });

    return NextResponse.json({ message: "Other income deleted successfully" });
  } catch (error) {
    return handleApiError(error, "deleting other income");
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

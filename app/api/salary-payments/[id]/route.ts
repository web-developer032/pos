import { NextResponse } from "next/server";
import { requireAuth, AuthRequest, RouteContext } from "@/lib/middleware/auth";
import { prisma } from "@/lib/db";
import type { SalaryPaymentType } from "@/prisma/generated/prisma/client";
import { z } from "zod";
import { handleApiError, handleValidationError } from "@/lib/utils/apiHelpers";

const updateSchema = z.object({
  amount: z.number().min(0.01).optional(),
  payment_type: z.enum(["salary", "advance", "bonus", "deduction"]).optional(),
  period: z.string().min(1).optional(),
  days_worked: z.number().min(0).optional(),
  payment_method: z.enum(["cash", "bank_transfer", "check", "other"]).optional(),
  notes: z.string().optional(),
});

function toPaymentResponse(p: {
  id: number;
  employeeId: number;
  amount: number;
  paymentType: string;
  period: string;
  daysWorked: number | null;
  paymentMethod: string;
  notes: string | null;
  userId: number;
  createdAt: Date;
  employee?: { name: string; salaryType: string } | null;
  user?: { username: string } | null;
}) {
  const { employee, user, ...rest } = p;
  return {
    id: rest.id,
    employee_id: rest.employeeId,
    amount: rest.amount,
    payment_type: rest.paymentType,
    period: rest.period,
    days_worked: rest.daysWorked,
    payment_method: rest.paymentMethod,
    notes: rest.notes,
    user_id: rest.userId,
    created_at: rest.createdAt,
    employee_name: employee?.name ?? null,
    salary_type: employee?.salaryType ?? null,
    user_name: user?.username ?? null,
  };
}

async function getHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const paymentId = parseInt(id, 10);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const payment = await prisma.salaryPayment.findUnique({
      where: { id: paymentId },
      include: {
        employee: { select: { name: true, salaryType: true } },
        user: { select: { username: true } },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ payment: toPaymentResponse(payment) });
  } catch (error) {
    return handleApiError(error, "fetching salary payment");
  }
}

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const paymentId = parseInt(id, 10);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    const validated = updateSchema.parse(body);

    const existing = await prisma.salaryPayment.findUnique({
      where: { id: paymentId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const data: {
      amount?: number;
      paymentType?: SalaryPaymentType;
      period?: string;
      daysWorked?: number;
      paymentMethod?: string;
      notes?: string | null;
    } = {};
    if (validated.amount !== undefined) data.amount = validated.amount;
    if (validated.payment_type !== undefined) data.paymentType = validated.payment_type as SalaryPaymentType;
    if (validated.period !== undefined) data.period = validated.period;
    if (validated.days_worked !== undefined) data.daysWorked = validated.days_worked;
    if (validated.payment_method !== undefined) data.paymentMethod = validated.payment_method;
    if (validated.notes !== undefined) data.notes = validated.notes ?? null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const payment = await prisma.salaryPayment.update({
      where: { id: paymentId },
      data,
      include: {
        employee: { select: { name: true, salaryType: true } },
        user: { select: { username: true } },
      },
    });

    return NextResponse.json({ payment: toPaymentResponse(payment) });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "updating salary payment");
  }
}

async function deleteHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const { id } = await context!.params;
    const paymentId = parseInt(id, 10);

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = await prisma.salaryPayment.findUnique({
      where: { id: paymentId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    await prisma.salaryPayment.delete({
      where: { id: paymentId },
    });

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    return handleApiError(error, "deleting salary payment");
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

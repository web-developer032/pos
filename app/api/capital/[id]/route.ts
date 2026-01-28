import { NextResponse } from "next/server";
import { requireAuth, RouteContext, AuthRequest } from "@/lib/middleware/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateCapitalSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  transaction_type: z.enum(["investment", "withdrawal"]),
  notes: z.string().optional(),
});

function toCapitalResponse(c: { id: number; amount: number; description: string | null; transactionType: string; notes: string | null; userId: number; createdAt: Date; user?: { username: string } | null }) {
  const { user, ...rest } = c;
  return {
    id: rest.id,
    amount: rest.amount,
    description: rest.description,
    transaction_type: rest.transactionType,
    notes: rest.notes,
    user_id: rest.userId,
    created_at: rest.createdAt,
    user_name: user?.username ?? null,
  };
}

async function getHandler(req: Request, context?: RouteContext) {
  try {
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const capital = await prisma.capital.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    });

    if (!capital) {
      return NextResponse.json(
        { error: "Capital record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ capital: toCapitalResponse(capital) });
  } catch (error) {
    console.error("Error fetching capital record:", error);
    return NextResponse.json(
      { error: "Failed to fetch capital record" },
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
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const validated = updateCapitalSchema.parse(body);

    const existing = await prisma.capital.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Capital record not found" },
        { status: 404 }
      );
    }

    await prisma.capital.update({
      where: { id },
      data: {
        amount: validated.amount,
        description: validated.description ?? null,
        transactionType: validated.transaction_type,
        notes: validated.notes ?? null,
      },
    });

    const capital = await prisma.capital.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    });

    return NextResponse.json({ capital: capital ? toCapitalResponse(capital) : null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating capital record:", error);
    return NextResponse.json(
      { error: "Failed to update capital record" },
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
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await prisma.capital.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Capital record not found" },
        { status: 404 }
      );
    }

    await prisma.capital.delete({ where: { id } });

    return NextResponse.json({ message: "Capital record deleted successfully" });
  } catch (error) {
    console.error("Error deleting capital record:", error);
    return NextResponse.json(
      { error: "Failed to delete capital record" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

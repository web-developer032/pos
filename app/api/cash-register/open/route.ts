import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId } from "@/lib/auth/requestContext";
import { prisma } from "@/lib/db";
import {
  serializeSession,
  SessionRow,
} from "@/lib/utils/cashRegisterHelpers";

export const dynamic = "force-dynamic";

const openSessionSchema = z.object({
  opening_balance: z.number().min(0, "Opening balance must be non-negative"),
  notes: z.string().optional(),
});

async function postHandler(req: AuthRequest) {
  try {
    const userId = getCurrentUserId(req);
    const body = await req.json();
    const validatedData = openSessionSchema.parse(body);

    const existing = await prisma.cashRegisterSession.findFirst({
      where: { status: "open", userId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A session is already open. Please close it first." },
        { status: 400 }
      );
    }

    const session = await prisma.cashRegisterSession.create({
      data: {
        userId,
        openingBalance: validatedData.opening_balance,
        status: "open",
        notes: validatedData.notes ?? null,
      },
      include: { user: { select: { username: true } } },
    });

    const row: SessionRow = {
      id: session.id,
      user_id: session.userId,
      opening_balance: session.openingBalance,
      closing_balance: session.closingBalance,
      expected_balance: session.expectedBalance,
      variance: session.variance,
      status: session.status,
      opened_at: session.openedAt.toISOString(),
      closed_at: session.closedAt?.toISOString() ?? null,
      notes: session.notes,
      user_name: session.user?.username ?? null,
    };

    return NextResponse.json({
      message: "Day opened successfully",
      session: serializeSession(row),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Error opening session:", error);
    return NextResponse.json(
      { error: "Failed to open session" },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(postHandler, { requiredFeature: "cash_register" });

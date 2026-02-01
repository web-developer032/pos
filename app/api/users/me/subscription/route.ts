import { NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import { prisma } from "@/lib/db";
import { getActiveSubscription } from "@/lib/auth/subscription";
import { z } from "zod";

const updateSubscriptionSchema = z.object({
  plan: z.enum(["basic", "pro", "enterprise"]),
  interval: z.enum(["weekly", "monthly", "lifetime"]),
});

async function getHandler(req: AuthRequest) {
  const user = req.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const subscription = await getActiveSubscription(user.userId);
  if (!subscription) {
    return NextResponse.json({
      subscription: null,
      message: "No active subscription",
    });
  }
  return NextResponse.json({
    subscription: {
      id: subscription.id,
      plan: subscription.plan,
      interval: subscription.interval,
      status: subscription.status,
      expiresAt: subscription.expiresAt,
    },
  });
}

async function patchHandler(req: AuthRequest) {
  const user = req.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const validated = updateSubscriptionSchema.parse(body);

    const expiresAt = (() => {
      if (validated.interval === "lifetime") return null;
      const d = new Date();
      if (validated.interval === "weekly") d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
      return d;
    })();

    const existing = await prisma.subscription.findFirst({
      where: { userId: user.userId, status: "active" },
      orderBy: { startedAt: "desc" },
    });

    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          plan: validated.plan,
          interval: validated.interval,
          expiresAt,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: user.userId,
          plan: validated.plan,
          interval: validated.interval,
          status: "active",
          expiresAt,
        },
      });
    }

    const subscription = await getActiveSubscription(user.userId);
    return NextResponse.json({
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            interval: subscription.interval,
            status: subscription.status,
            expiresAt: subscription.expiresAt,
            features: subscription.features,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PATCH = requireAuth(patchHandler);

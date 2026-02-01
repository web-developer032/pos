import { NextResponse } from "next/server";
import { requireAuth, AuthRequest, RouteContext } from "@/lib/middleware/auth";
import { prisma } from "@/lib/db";
import { getActiveSubscription } from "@/lib/auth/subscription";
import { z } from "zod";

const updateSubscriptionSchema = z.object({
  plan: z.enum(["basic", "pro", "enterprise"]),
  interval: z.enum(["weekly", "monthly", "lifetime"]),
  status: z.enum(["active", "cancelled", "expired", "trialing"]).optional(),
});

async function patchHandler(req: AuthRequest, context?: RouteContext) {
  const admin = req.user;
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const params = await context!.params;
  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
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
      where: { userId, status: "active" },
      orderBy: { startedAt: "desc" },
    });

    const status = validated.status ?? "active";

    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          plan: validated.plan,
          interval: validated.interval,
          status,
          expiresAt: status === "active" ? expiresAt : existing.expiresAt,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId,
          plan: validated.plan,
          interval: validated.interval,
          status,
          expiresAt: status === "active" ? expiresAt : null,
        },
      });
    }

    const subscription = await getActiveSubscription(userId);
    return NextResponse.json({
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            interval: subscription.interval,
            status: subscription.status,
            expiresAt: subscription.expiresAt,
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
    console.error("Error updating user subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

export const PATCH = requireAuth(patchHandler, { allowedRoles: ["admin"] });

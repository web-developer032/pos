import { prisma } from "@/lib/db";
import { getEnabledFeatures } from "@/lib/constants/planFeatures";
import type { PlanType } from "@/lib/constants/planFeatures";

export type ActiveSubscriptionResult = {
  id: number;
  plan: PlanType;
  interval: string;
  status: string;
  expiresAt: Date | null;
  features: string[];
} | null;

/** Get the active subscription for a user (status active, not expired). Returns null if none. */
export async function getActiveSubscription(
  userId: number
): Promise<ActiveSubscriptionResult> {
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { startedAt: "desc" },
  });
  if (!sub) return null;
  const features = Array.from(getEnabledFeatures(sub.plan as PlanType));
  return {
    id: sub.id,
    plan: sub.plan as PlanType,
    interval: sub.interval,
    status: sub.status,
    expiresAt: sub.expiresAt,
    features,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import { prisma } from "@/lib/db";
import { getActiveSubscription } from "@/lib/auth/subscription";

async function handler(req: AuthRequest) {
  const user = req.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { id: true, username: true, email: true, role: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const subscription = await getActiveSubscription(dbUser.id);

  return NextResponse.json({
    user: {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      role: dbUser.role,
      plan: subscription?.plan ?? null,
      subscriptionInterval: subscription?.interval ?? null,
      subscriptionStatus: subscription?.status ?? null,
      features: subscription?.features ?? [],
    },
  });
}

// Next 15 route handler type: static route has no second param
export const GET = requireAuth(handler) as (
  req: NextRequest
) => Promise<NextResponse>;

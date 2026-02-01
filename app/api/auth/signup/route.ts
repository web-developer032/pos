import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, generateToken } from "@/lib/auth/auth";
import { getActiveSubscription } from "@/lib/auth/subscription";
import { z } from "zod";

const signupSchema = z.object({
  username: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
});

// New signups always get the Basic plan (free for everyone)
const SIGNUP_PLAN = "basic" as const;
const SIGNUP_INTERVAL = "lifetime" as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = signupSchema.parse(body);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: validated.username },
          { email: validated.email },
        ],
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Username or email already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(validated.password);
    const user = await prisma.user.create({
      data: {
        username: validated.username,
        email: validated.email,
        passwordHash,
        role: "cashier",
      },
      select: { id: true, username: true, email: true, role: true },
    });

    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: SIGNUP_PLAN,
        interval: SIGNUP_INTERVAL,
        status: "active",
        expiresAt: null, // lifetime = no expiry
      },
    });

    const subscription = await getActiveSubscription(user.id);
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    const response = NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: subscription?.plan ?? SIGNUP_PLAN,
        subscriptionInterval: subscription?.interval ?? SIGNUP_INTERVAL,
        subscriptionStatus: subscription?.status ?? "active",
        features: subscription?.features ?? [],
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

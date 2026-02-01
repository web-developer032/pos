import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/auth";
import { z } from "zod";
import { buildPaginationResponse, getPaginationParams } from "@/lib/utils/apiHelpers";

const userSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "cashier", "manager"]),
});

async function getHandler(req: NextRequest) {
  try {
    const { page, limit, offset } = getPaginationParams(req);
    const now = new Date();

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          subscriptions: {
            where: {
              status: "active",
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              id: true,
              plan: true,
              interval: true,
              status: true,
              startedAt: true,
              expiresAt: true,
            },
          },
        },
        orderBy: { username: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      users: users.map((u) => {
        const sub = u.subscriptions[0] ?? null;
        return {
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          created_at: u.createdAt,
          subscription: sub
            ? {
                id: sub.id,
                plan: sub.plan,
                interval: sub.interval,
                status: sub.status,
                started_at: sub.startedAt,
                expires_at: sub.expiresAt,
              }
            : null,
        };
      }),
      pagination: buildPaginationResponse(total, page, limit),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

async function postHandler(req: AuthRequest) {
  try {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = userSchema.parse(body);

    const passwordHash = await hashPassword(validated.password);

    const newUser = await prisma.user.create({
      data: {
        username: validated.username,
        email: validated.email,
        passwordHash,
        role: validated.role,
      },
      select: { id: true, username: true, email: true, role: true },
    });

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: AuthRequest) {
  try {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      await prisma.user.deleteMany({ where: { role: { not: "admin" } } });
      return NextResponse.json({
        message: "All non-admin users deleted successfully",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error deleting users:", error);
    return NextResponse.json(
      { error: "Failed to delete users" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler, ["admin"]);
export const POST = requireAuth(postHandler, ["admin"]);
export const DELETE = requireAuth(deleteHandler, ["admin"]);

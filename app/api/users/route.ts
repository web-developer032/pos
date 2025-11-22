import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { hashPassword } from "@/lib/auth/auth";
import { z } from "zod";

const userSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "cashier", "manager"]),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await client.execute(
      "SELECT COUNT(*) as total FROM users"
    );
    const total = (countResult.rows[0] as unknown as { total: number }).total;

    const result = await client.execute({
      sql: "SELECT id, username, email, role, created_at FROM users ORDER BY username LIMIT ? OFFSET ?",
      args: [limit, offset],
    });
    return NextResponse.json({
      users: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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

    const result = await client.execute({
      sql: "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id, username, email, role",
      args: [validated.username, validated.email, passwordHash, validated.role],
    });

    return NextResponse.json({ user: result.rows[0] }, { status: 201 });
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
      await client.execute("DELETE FROM users WHERE role != 'admin'");
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

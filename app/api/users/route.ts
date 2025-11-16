import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
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
    const result = await client.execute(
      "SELECT id, username, email, role, created_at FROM users ORDER BY username"
    );
    return NextResponse.json({ users: result.rows });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest) {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") {
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
        { error: "Invalid input", details: error.errors },
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

export const GET = requireAuth(getHandler, ["admin"]);
export const POST = requireAuth(postHandler, ["admin"]);


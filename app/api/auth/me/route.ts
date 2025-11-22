import { NextResponse } from "next/server";
import { requireAuth, AuthRequest } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function handler(req: AuthRequest) {
  const user = req.user;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await client.execute({
    sql: "SELECT id, username, email, role FROM users WHERE id = ?",
    args: [user.userId],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: result.rows[0],
  });
}

export const GET = requireAuth(handler);

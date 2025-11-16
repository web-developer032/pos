import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";

async function handler(req: NextRequest) {
  const user = (req as any).user;

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


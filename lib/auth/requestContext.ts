import type { AuthRequest } from "@/lib/middleware/auth";

/**
 * Returns the current user's ID from the request. Use in every route that touches
 * scoped data. Throws 403 if user is not authenticated.
 */
export function getCurrentUserId(req: AuthRequest): number {
  const userId = req.user?.userId;
  if (userId == null || typeof userId !== "number") {
    throw new Response(
      JSON.stringify({ error: "Forbidden - Authentication required" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
  return userId;
}

/**
 * Prisma where clause to scope by user. Use with findMany/findFirst/findUnique:
 * prisma.category.findMany({ where: { ...whereUserId(userId), ...other } })
 */
export function whereUserId(userId: number): { userId: number } {
  return { userId };
}

/**
 * SQL fragment and param for raw queries. Append " AND user_id = ?" to WHERE
 * and add userId to the params array.
 */
export function sqlUserId(userId: number): { fragment: string; param: number } {
  return { fragment: " AND user_id = ?", param: userId };
}

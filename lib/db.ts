import { PrismaClient } from "@/prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL ?? "";
const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.PRISMA_LOG_QUERIES === "1"
        ? ["query", "error", "warn"]
        : ["error"],
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Convert ? placeholders to $1,$2,... for PostgreSQL */
function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Recursively convert BigInt/Date for JSON and query compatibility. */
function toSerializable<T>(obj: T): T {
  if (typeof obj === "bigint") return Number(obj) as T;
  if (obj instanceof Date) return obj.toISOString() as T;
  if (Array.isArray(obj)) return obj.map(toSerializable) as T;
  if (obj !== null && typeof obj === "object") {
    const result = {} as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      result[k] = toSerializable(v);
    }
    return result as T;
  }
  return obj;
}

/** Run raw SELECT; returns rows. BigInt values are converted to Number for JSON compatibility. */
export async function sqlQuery<T = unknown>(
  sql: string,
  args: unknown[] = []
): Promise<T[]> {
  const pgSql = toPgPlaceholders(sql);
  const result = await prisma.$queryRawUnsafe(pgSql, ...args);
  return (result as T[]).map((row) => toSerializable(row));
}

/** Run raw INSERT/UPDATE/DELETE; returns number of rows affected. */
export async function sqlExecute(
  sql: string,
  args: unknown[] = []
): Promise<number> {
  const pgSql = toPgPlaceholders(sql);
  return prisma.$executeRawUnsafe(pgSql, ...args);
}

export default prisma;

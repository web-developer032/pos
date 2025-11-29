import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import client from "@/lib/db";

/**
 * Pagination parameters from request
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Extract pagination parameters from request
 */
export function getPaginationParams(req: NextRequest): PaginationParams {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build pagination response
 */
export function buildPaginationResponse(
  total: number,
  page: number,
  limit: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Build search condition for SQL
 */
export interface SearchCondition {
  sql: string;
  args: (string | number)[];
}

/**
 * Build LIKE search conditions for multiple columns
 */
export function buildSearchCondition(
  search: string | null,
  columns: string[],
  prefix = ""
): SearchCondition {
  const condition: SearchCondition = { sql: "", args: [] };

  if (!search) return condition;

  const searchTerm = `%${search}%`;
  const conditions = columns.map((col) => {
    const column = prefix ? `${prefix}.${col}` : col;
    return `${column} LIKE ?`;
  });

  condition.sql = ` AND (${conditions.join(" OR ")})`;
  condition.args = columns.map(() => searchTerm);

  return condition;
}

/**
 * Get total count from SQL query
 */
export async function getTotalCount(
  baseSql: string,
  args: (string | number)[]
): Promise<number> {
  // Replace SELECT clause with COUNT(*)
  const countSql = baseSql.replace(
    /SELECT[\s\S]*?FROM/i,
    "SELECT COUNT(*) as total FROM"
  );
  const countResult = await client.execute({ sql: countSql, args });
  return (countResult.rows[0] as unknown as { total: number }).total;
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: unknown): NextResponse | null {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid input", details: error.issues },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Handle API errors with consistent response format
 */
export function handleApiError(
  error: unknown,
  context: string,
  defaultMessage?: string
): NextResponse {
  console.error(`Error in ${context}:`, error);

  // Check if it's a validation error first
  const validationError = handleValidationError(error);
  if (validationError) return validationError;

  return NextResponse.json(
    { error: defaultMessage || `Failed to ${context}` },
    { status: 500 }
  );
}

/**
 * Execute paginated query
 */
export interface PaginatedQueryOptions {
  baseSql: string;
  baseArgs: (string | number)[];
  orderBy: string;
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: ReturnType<typeof buildPaginationResponse>;
}

export async function executePaginatedQuery<T>(
  options: PaginatedQueryOptions
): Promise<PaginatedResult<T>> {
  const { baseSql, baseArgs, orderBy, page, limit, offset } = options;

  // Get total count
  const total = await getTotalCount(baseSql, baseArgs);

  // Execute paginated query
  const sql = `${baseSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  const args = [...baseArgs, limit, offset];
  const result = await client.execute({ sql, args });

  return {
    data: result.rows as T[],
    pagination: buildPaginationResponse(total, page, limit),
  };
}


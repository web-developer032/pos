import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { sqlQuery, sqlExecute } from "@/lib/db";
import { z } from "zod";
import {
  getPaginationParams,
  executePaginatedQuery,
  buildSearchCondition,
  handleApiError,
  handleValidationError,
} from "@/lib/utils/apiHelpers";
import { getCurrentTimestamp } from "@/lib/utils/dateTime";

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  loyalty_points: z.number().int().min(0).optional(),
});

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const { page, limit, offset } = getPaginationParams(req);

    let sql = "SELECT * FROM customers WHERE 1=1";
    const args: (string | number)[] = [];

    // Add search condition
    const searchCondition = buildSearchCondition(search, [
      "name",
      "email",
      "phone",
    ]);
    sql += searchCondition.sql;
    args.push(...searchCondition.args);

    const result = await executePaginatedQuery({
      baseSql: sql,
      baseArgs: args,
      orderBy: "name",
      page,
      limit,
      offset,
    });

    return NextResponse.json({
      customers: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return handleApiError(error, "fetching customers");
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = customerSchema.parse(body);

    const rows = await sqlQuery(
      "INSERT INTO customers (name, email, phone, address, loyalty_points, created_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
      [
        validated.name,
        validated.email || null,
        validated.phone || null,
        validated.address || null,
        validated.loyalty_points ?? 0,
        getCurrentTimestamp(),
      ]
    );

    return NextResponse.json({ customer: rows[0] }, { status: 201 });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating customer");
  }
}

async function deleteHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      await sqlExecute("DELETE FROM customers", []);
      return NextResponse.json({
        message: "All customers deleted successfully",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "deleting customers");
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  loyalty_points: z.number().int().min(0).optional(),
});

async function getHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const result = await client.execute({
      sql: "SELECT * FROM customers WHERE id = ?",
      args: [params.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer: result.rows[0] });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

async function putHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await req.json();
    const validated = customerSchema.parse(body);

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name !== undefined) {
      updates.push("name = ?");
      values.push(validated.name);
    }
    if (validated.email !== undefined) {
      updates.push("email = ?");
      values.push(validated.email || null);
    }
    if (validated.phone !== undefined) {
      updates.push("phone = ?");
      values.push(validated.phone);
    }
    if (validated.address !== undefined) {
      updates.push("address = ?");
      values.push(validated.address);
    }
    if (validated.loyalty_points !== undefined) {
      updates.push("loyalty_points = ?");
      values.push(validated.loyalty_points);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(params.id);

    const result = await client.execute({
      sql: `UPDATE customers SET ${updates.join(", ")} WHERE id = ? RETURNING *`,
      args: values,
    });

    return NextResponse.json({ customer: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

async function deleteHandler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    await client.execute({
      sql: "DELETE FROM customers WHERE id = ?",
      args: [params.id],
    });

    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);

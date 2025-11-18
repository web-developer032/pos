import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

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

    let sql = "SELECT * FROM customers WHERE 1=1";
    const args: any[] = [];

    if (search) {
      sql += " AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)";
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    sql += " ORDER BY name";

    const result = await client.execute({ sql, args });
    return NextResponse.json({ customers: result.rows });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = customerSchema.parse(body);

    const result = await client.execute({
      sql: "INSERT INTO customers (name, email, phone, address, loyalty_points) VALUES (?, ?, ?, ?, ?) RETURNING *",
      args: [
        validated.name,
        validated.email || null,
        validated.phone || null,
        validated.address || null,
        validated.loyalty_points || 0,
      ],
    });

    return NextResponse.json({ customer: result.rows[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);


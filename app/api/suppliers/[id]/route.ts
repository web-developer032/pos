import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(1).optional(),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

async function getHandler(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await client.execute({
      sql: "SELECT * FROM suppliers WHERE id = ?",
      args: [params.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ supplier: result.rows[0] });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}

async function putHandler(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const validated = supplierSchema.parse(body);

    const updates: string[] = [];
    const values: any[] = [];

    if (validated.name !== undefined) {
      updates.push("name = ?");
      values.push(validated.name);
    }
    if (validated.contact_person !== undefined) {
      updates.push("contact_person = ?");
      values.push(validated.contact_person);
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

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(params.id);

    const result = await client.execute({
      sql: `UPDATE suppliers SET ${updates.join(", ")} WHERE id = ? RETURNING *`,
      args: values,
    });

    return NextResponse.json({ supplier: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating supplier:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await client.execute({
      sql: "DELETE FROM suppliers WHERE id = ?",
      args: [params.id],
    });

    return NextResponse.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}

export const GET = requireAuth(getHandler);
export const PUT = requireAuth(putHandler);
export const DELETE = requireAuth(deleteHandler);


import { NextResponse } from "next/server";
import { requireAuth, RouteContext, type AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId, whereUserId } from "@/lib/auth/requestContext";
import { prisma } from "@/lib/db";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().min(1).optional(),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

async function getHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const userId = getCurrentUserId(req);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const supplier = await prisma.supplier.findFirst({
      where: { id, ...whereUserId(userId) },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
      { status: 500 }
    );
  }
}

async function putHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const userId = getCurrentUserId(req);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const validated = supplierSchema.parse(body);

    const data: {
      name?: string;
      contactPerson?: string | null;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
    } = {};
    if (validated.name !== undefined) data.name = validated.name;
    if (validated.contact_person !== undefined)
      data.contactPerson = validated.contact_person ?? null;
    if (validated.email !== undefined) data.email = validated.email || null;
    if (validated.phone !== undefined) data.phone = validated.phone ?? null;
    if (validated.address !== undefined) data.address = validated.address ?? null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.updateMany({
      where: { id, ...whereUserId(userId) },
      data,
    });
    if (supplier.count === 0) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }
    const updated = await prisma.supplier.findFirst({
      where: { id, ...whereUserId(userId) },
    });

    return NextResponse.json({ supplier: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
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

async function deleteHandler(req: AuthRequest, context?: RouteContext) {
  try {
    const userId = getCurrentUserId(req);
    if (!context) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const params = await context.params;
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await prisma.supplier.deleteMany({
      where: { id, ...whereUserId(userId) },
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

export const GET = requireAuth(getHandler, { requiredFeature: "suppliers" });
export const PUT = requireAuth(putHandler, { requiredFeature: "suppliers" });
export const DELETE = requireAuth(deleteHandler, { requiredFeature: "suppliers" });

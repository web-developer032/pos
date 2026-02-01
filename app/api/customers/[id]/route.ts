import { NextResponse } from "next/server";
import { requireAuth, RouteContext, type AuthRequest } from "@/lib/middleware/auth";
import { getCurrentUserId, whereUserId } from "@/lib/auth/requestContext";
import { prisma } from "@/lib/db";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  loyalty_points: z.number().int().min(0).optional(),
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
    const customer = await prisma.customer.findFirst({
      where: { id, ...whereUserId(userId) },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
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
    const validated = customerSchema.parse(body);

    const data: {
      name?: string;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      loyaltyPoints?: number;
    } = {};
    if (validated.name !== undefined) data.name = validated.name;
    if (validated.email !== undefined) data.email = validated.email || null;
    if (validated.phone !== undefined) data.phone = validated.phone ?? null;
    if (validated.address !== undefined) data.address = validated.address ?? null;
    if (validated.loyalty_points !== undefined)
      data.loyaltyPoints = validated.loyalty_points;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const result = await prisma.customer.updateMany({
      where: { id, ...whereUserId(userId) },
      data,
    });
    if (result.count === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }
    const customer = await prisma.customer.findFirst({
      where: { id, ...whereUserId(userId) },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
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
    await prisma.customer.deleteMany({
      where: { id, ...whereUserId(userId) },
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

export const GET = requireAuth(getHandler, { requiredFeature: "customers" });
export const PUT = requireAuth(putHandler, { requiredFeature: "customers" });
export const DELETE = requireAuth(deleteHandler, { requiredFeature: "customers" });

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getPaginationParams,
  buildPaginationResponse,
  handleApiError,
  handleValidationError,
} from "@/lib/utils/apiHelpers";

const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

async function getHandler(req: NextRequest) {
  try {
    const { page, limit, offset } = getPaginationParams(req);

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        orderBy: { name: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.category.count(),
    ]);

    return NextResponse.json({
      categories,
      pagination: buildPaginationResponse(total, page, limit),
    });
  } catch (error) {
    return handleApiError(error, "fetching categories");
  }
}

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = categorySchema.parse(body);

    const category = await prisma.category.create({
      data: {
        name: validated.name,
        description: validated.description ?? undefined,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const validationError = handleValidationError(error);
    if (validationError) return validationError;
    return handleApiError(error, "creating category");
  }
}

async function deleteHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get("delete_all") === "true";

    if (deleteAll) {
      await prisma.category.deleteMany();
      return NextResponse.json({
        message: "All categories deleted successfully",
      });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "deleting categories");
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
export const DELETE = requireAuth(deleteHandler);

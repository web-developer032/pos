import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { updateProductQuantity } from "@/lib/utils/productQuantity";

const adjustSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int(),
  transaction_type: z.enum(["sale", "purchase", "adjustment"]),
  notes: z.string().optional(),
});

async function postHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = adjustSchema.parse(body);

    const product = await prisma.product.findFirst({
      where: { id: validated.product_id, deletedAt: null },
      select: { baseProductId: true, stockQuantity: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const currentStock = product.stockQuantity;

    // Prevent direct adjustments for related products
    if (product.baseProductId) {
      return NextResponse.json(
        {
          error: "Cannot adjust related product directly. Please adjust the base product instead.",
          base_product_id: product.baseProductId,
        },
        { status: 400 }
      );
    }

    let adjustmentQuantity = validated.quantity;
    let operation: 'add' | 'subtract' = 'add';

    if (validated.transaction_type === "purchase") {
      operation = 'add';
      adjustmentQuantity = validated.quantity;
    } else if (validated.transaction_type === "sale") {
      operation = 'subtract';
      adjustmentQuantity = validated.quantity;
      // Note: We don't check stock here as adjustments can go negative
    } else {
      // Adjustment: Set absolute value - calculate difference
      const difference = validated.quantity - currentStock;
      if (difference > 0) {
        operation = 'add';
        adjustmentQuantity = difference;
      } else if (difference < 0) {
        operation = 'subtract';
        adjustmentQuantity = Math.abs(difference);
      } else {
        // No change needed
        return NextResponse.json({
          message: "Inventory adjusted successfully",
          new_stock: currentStock,
        });
      }
    }

    // Update stock with relationship logic
    await updateProductQuantity(
      validated.product_id,
      adjustmentQuantity,
      operation,
      undefined,
      validated.transaction_type
    );
    
    const updated = await prisma.product.findFirst({
      where: { id: validated.product_id, deletedAt: null },
      select: { stockQuantity: true },
    });
    const newStock = updated?.stockQuantity ?? currentStock;

    return NextResponse.json({
      message: "Inventory adjusted successfully",
      new_stock: newStock,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error adjusting inventory:", error);
    return NextResponse.json(
      { error: "Failed to adjust inventory" },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(postHandler);

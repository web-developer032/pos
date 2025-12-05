import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
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

    // Get product details including type and relationships
    const productResult = await client.execute({
      sql: `SELECT product_type, base_product_id, composite_product_id, stock_quantity 
            FROM products WHERE id = ? AND deleted_at IS NULL`,
      args: [validated.product_id],
    });

    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = productResult.rows[0] as unknown as {
      product_type: string;
      base_product_id: number | null;
      composite_product_id: number | null;
      stock_quantity: number;
    };

    // Prevent direct adjustments for packings and composites
    if (product.product_type === "packing" && product.base_product_id) {
      return NextResponse.json(
        {
          error: "Cannot adjust packing product directly. Please adjust the base product instead.",
          base_product_id: product.base_product_id,
        },
        { status: 400 }
      );
    }

    if (product.product_type === "composite" && product.composite_product_id) {
      return NextResponse.json(
        {
          error: "Cannot adjust composite product directly. Please adjust the base product instead.",
          base_product_id: product.composite_product_id,
        },
        { status: 400 }
      );
    }

    const currentStock = product.stock_quantity;
    
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
    
    // Get the new stock for response (for base/simple products)
    // For packings/composites, we'd need to check the base product, but for simplicity
    // we'll just return the adjusted product's stock
    const updatedProductResult = await client.execute({
      sql: "SELECT stock_quantity FROM products WHERE id = ? AND deleted_at IS NULL",
      args: [validated.product_id],
    });
    const newStock = updatedProductResult.rows.length > 0
      ? (updatedProductResult.rows[0] as unknown as { stock_quantity: number }).stock_quantity
      : currentStock;

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

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import client from "@/lib/db";
import { z } from "zod";

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

    // Update product stock
    const productResult = await client.execute({
      sql: "SELECT stock_quantity FROM products WHERE id = ?",
      args: [validated.product_id],
    });

    if (productResult.rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const currentStock = (
      productResult.rows[0] as unknown as { stock_quantity: number }
    ).stock_quantity;
    let newStock = currentStock;

    if (validated.transaction_type === "purchase") {
      newStock = currentStock + validated.quantity;
    } else if (validated.transaction_type === "sale") {
      newStock = currentStock - validated.quantity;
      if (newStock < 0) {
        return NextResponse.json(
          { error: "Insufficient stock" },
          { status: 400 }
        );
      }
    } else {
      newStock = validated.quantity;
    }

    await client.execute({
      sql: "UPDATE products SET stock_quantity = ? WHERE id = ?",
      args: [newStock, validated.product_id],
    });

    // Record transaction
    await client.execute({
      sql: "INSERT INTO inventory_transactions (product_id, transaction_type, quantity, notes) VALUES (?, ?, ?, ?)",
      args: [
        validated.product_id,
        validated.transaction_type,
        validated.quantity,
        validated.notes || null,
      ],
    });

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

import { prisma } from "@/lib/db";

type TransactionType = "sale" | "purchase" | "adjustment" | "return";

/**
 * Update product quantity based on product relationships
 * If product is a related product (has base_product_id), convert quantity using quantity_multiplier
 * and update the base product's stock. Otherwise, update the product's own stock.
 */
export async function updateProductQuantity(
  productId: number,
  quantity: number,
  operation: "subtract" | "add",
  referenceId?: number,
  transactionType: TransactionType = "sale"
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { baseProductId: true, quantityMultiplier: true },
  });

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  if (product.baseProductId) {
    const baseQuantity = quantity * (product.quantityMultiplier ?? 1);
    await updateProductQuantity(
      product.baseProductId,
      baseQuantity,
      operation,
      referenceId,
      transactionType
    );
    await prisma.inventoryTransaction.create({
      data: {
        productId,
        transactionType,
        quantity: Math.round(quantity),
        referenceId: referenceId ?? null,
      },
    });
  } else {
    const delta = operation === "subtract" ? -quantity : quantity;
    await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: { increment: delta } },
    });
    await prisma.inventoryTransaction.create({
      data: {
        productId,
        transactionType,
        quantity: Math.round(quantity),
        referenceId: referenceId ?? null,
      },
    });
  }
}

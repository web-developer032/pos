import client from "@/lib/db";

/**
 * Update product quantity based on product relationships
 * If product is a related product (has base_product_id), convert quantity using quantity_multiplier
 * and update the base product's stock. Otherwise, update the product's own stock.
 */
export async function updateProductQuantity(
  productId: number,
  quantity: number,
  operation: 'subtract' | 'add',
  referenceId?: number,
  transactionType: 'sale' | 'purchase' | 'adjustment' | 'return' = 'sale'
) {
  // Get product details
  const productResult = await client.execute({
    sql: "SELECT base_product_id, quantity_multiplier FROM products WHERE id = ? AND deleted_at IS NULL",
    args: [productId],
  });

  if (productResult.rows.length === 0) {
    throw new Error(`Product ${productId} not found`);
  }

  const product = productResult.rows[0] as unknown as {
    base_product_id: number | null;
    quantity_multiplier: number | null;
  };

  if (product.base_product_id) {
    // Related product: Convert to base units and update base product
    const baseQuantity = quantity * (product.quantity_multiplier || 1);
    await updateProductQuantity(
      product.base_product_id,
      baseQuantity,
      operation,
      referenceId,
      transactionType
    );
    // Also record transaction for the related product for audit trail
    await client.execute({
      sql: "INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_id) VALUES (?, ?, ?, ?)",
      args: [productId, transactionType, quantity, referenceId || null],
    });
  } else {
    // Base product: Direct update
    const operator = operation === 'subtract' ? '-' : '+';
    await client.execute({
      sql: `UPDATE products SET stock_quantity = stock_quantity ${operator} ? WHERE id = ? AND deleted_at IS NULL`,
      args: [quantity, productId],
    });
    await client.execute({
      sql: "INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_id) VALUES (?, ?, ?, ?)",
      args: [productId, transactionType, quantity, referenceId || null],
    });
  }
}


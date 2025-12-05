import client from "@/lib/db";

/**
 * Update product quantity based on product type and relationships
 * This handles packings, composites, and base/simple products correctly
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
    sql: "SELECT product_type, base_product_id, base_unit_quantity, composite_product_id, composite_quantity FROM products WHERE id = ? AND deleted_at IS NULL",
    args: [productId],
  });

  if (productResult.rows.length === 0) {
    throw new Error(`Product ${productId} not found`);
  }

  const product = productResult.rows[0] as unknown as {
    product_type: string;
    base_product_id: number | null;
    base_unit_quantity: number | null;
    composite_product_id: number | null;
    composite_quantity: number | null;
  };

  if (product.product_type === 'packing' && product.base_product_id) {
    // Packing: Convert to base units and update base product
    const baseQuantity = quantity * (product.base_unit_quantity || 1);
    await updateProductQuantity(
      product.base_product_id,
      baseQuantity,
      operation,
      referenceId,
      transactionType
    );
    // Also record transaction for the packing product for audit trail
    await client.execute({
      sql: "INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_id) VALUES (?, ?, ?, ?)",
      args: [productId, transactionType, quantity, referenceId || null],
    });
  } else if (product.product_type === 'composite' && product.composite_product_id) {
    // Composite: Update linked product quantity
    const linkedQuantity = quantity * (product.composite_quantity || 1);
    await updateProductQuantity(
      product.composite_product_id,
      linkedQuantity,
      operation,
      referenceId,
      transactionType
    );
    // Record transaction for both composite and linked product
    await client.execute({
      sql: "INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_id) VALUES (?, ?, ?, ?)",
      args: [productId, transactionType, quantity, referenceId || null],
    });
    await client.execute({
      sql: "INSERT INTO inventory_transactions (product_id, transaction_type, quantity, reference_id) VALUES (?, ?, ?, ?)",
      args: [product.composite_product_id, transactionType, linkedQuantity, referenceId || null],
    });
  } else {
    // Direct update for base/simple products
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


import { Product } from "@/lib/api/productsApi";
import { roundPrice } from "./formHelpers";

/**
 * Type for products with stock information (used by both Product and InventoryItem)
 */
type ProductWithStock = {
  stock_quantity: number;
  min_stock_level: number;
  base_product_id?: number;
  quantity_multiplier?: number;
  base_product_stock?: number;
  unit?: string;
};

/**
 * Convert related product quantity to base units
 */
export function convertToBaseUnits(
  relatedProduct: Product,
  quantity: number
): number {
  return quantity * (relatedProduct.quantity_multiplier || 1);
}

/**
 * Calculate effective stock and min stock for a product based on relationships
 * If product is a related product (has base_product_id), calculate from base product stock
 * Returns both effective stock and effective min stock level
 * Works with both Product and InventoryItem types
 */
export function calculateEffectiveStock(product: ProductWithStock): {
  effectiveStock: number;
  effectiveMinStock: number;
  isComposite: boolean;
} {
  // Default values for base products
  let effectiveStock = product.stock_quantity;
  let effectiveMinStock = product.min_stock_level;
  let isComposite = false;

  // Handle related products (have base_product_id)
  if (
    product.base_product_id &&
    product.base_product_stock !== undefined &&
    product.quantity_multiplier !== undefined
  ) {
    const quantityMultiplier = product.quantity_multiplier || 1;

    // If quantity_multiplier is >= 1, it's a composite (whole units only)
    // If quantity_multiplier is < 1, it's a fractional packing
    if (quantityMultiplier >= 1) {
      isComposite = true;
      // Calculate how many composite units can be made (floor for whole units)
      effectiveStock = Math.floor(
        product.base_product_stock / quantityMultiplier
      );
      effectiveMinStock = Math.floor(
        (product.min_stock_level || 0) / quantityMultiplier
      );
    } else {
      // Fractional packing: convert base stock to packing units
      effectiveStock = product.base_product_stock / quantityMultiplier;
      effectiveMinStock = (product.min_stock_level || 0) / quantityMultiplier;
    }
  }

  return {
    effectiveStock,
    effectiveMinStock,
    isComposite,
  };
}

/**
 * Format stock value for display
 * - Composites: whole numbers only
 * - Others: whole numbers if integer, otherwise 2 decimal places
 */
export function formatStockDisplay(
  stock: number,
  isComposite: boolean
): string {
  if (isComposite) {
    return Math.floor(stock).toString();
  }
  return stock % 1 === 0 ? stock.toString() : stock.toFixed(2);
}

/**
 * Check if product stock is low based on effective stock
 */
export function isStockLow(
  effectiveStock: number,
  effectiveMinStock: number
): boolean {
  return effectiveStock <= effectiveMinStock;
}

/**
 * Calculate price for related product
 * Uses related product's own price if set, otherwise calculates from base
 */
export function calculateRelatedProductPrice(
  relatedProduct: Product,
  baseProduct?: Product
): number {
  // If related product has its own price, use it
  if (relatedProduct.selling_price > 0) {
    return relatedProduct.selling_price;
  }

  // Otherwise calculate from base product
  if (baseProduct && relatedProduct.quantity_multiplier) {
    return roundPrice(
      baseProduct.selling_price * relatedProduct.quantity_multiplier
    );
  }

  // Fallback to related product's price
  return relatedProduct.selling_price;
}

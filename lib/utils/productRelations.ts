import { Product } from "@/lib/api/productsApi";
import { roundPrice } from "./formHelpers";

/**
 * Type for products with stock information (used by both Product and InventoryItem)
 */
type ProductWithStock = {
  stock_quantity: number;
  min_stock_level: number;
  product_type?: "simple" | "base" | "packing" | "composite";
  base_product_id?: number;
  base_unit_quantity?: number;
  composite_product_id?: number;
  composite_quantity?: number;
  base_product_stock?: number;
  composite_base_stock?: number;
  unit?: string;
};

/**
 * Convert packing quantity to base units
 */
export function convertToBaseUnits(
  packingProduct: Product,
  quantity: number
): number {
  return quantity * (packingProduct.base_unit_quantity || 1);
}

/**
 * Convert composite quantity to base product quantity
 */
export function convertCompositeQuantity(
  compositeProduct: Product,
  quantity: number
): number {
  return quantity * (compositeProduct.composite_quantity || 1);
}

/**
 * Calculate price for variable quantity
 */
export function calculateVariablePrice(
  baseProduct: Product,
  quantity: number
): number {
  return roundPrice(baseProduct.selling_price * quantity);
}

/**
 * Calculate effective stock and min stock for a product based on its type and relationships
 * Returns both effective stock and effective min stock level
 * Works with both Product and InventoryItem types
 */
export function calculateEffectiveStock(product: ProductWithStock): {
  effectiveStock: number;
  effectiveMinStock: number;
  isComposite: boolean;
} {
  // Default values for simple/base products
  let effectiveStock = product.stock_quantity;
  let effectiveMinStock = product.min_stock_level;
  let isComposite = false;

  // Handle packings
  if (
    product.product_type === "packing" &&
    product.base_product_id &&
    product.base_product_stock !== undefined
  ) {
    const baseUnitQuantity = product.base_unit_quantity || 1;
    // Convert base stock to packing units
    effectiveStock = product.base_product_stock / baseUnitQuantity;
    // Min stock for packing is also calculated from base
    effectiveMinStock = (product.min_stock_level || 0) / baseUnitQuantity;
  }
  // Handle composites
  else if (
    product.product_type === "composite" &&
    product.composite_product_id &&
    product.composite_base_stock !== undefined
  ) {
    isComposite = true;
    const compositeQuantity = product.composite_quantity || 1;
    // Calculate how many composite units can be made (floor for whole units)
    effectiveStock = Math.floor(
      product.composite_base_stock / compositeQuantity
    );
    // Min stock for composite is also calculated from base
    effectiveMinStock = Math.floor(
      (product.min_stock_level || 0) / compositeQuantity
    );
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
 * Calculate price for packing product
 * Uses packing's own price if set, otherwise calculates from base
 */
export function calculatePackingPrice(
  packingProduct: Product,
  baseProduct?: Product
): number {
  // If packing has its own price, use it
  if (packingProduct.selling_price > 0) {
    return packingProduct.selling_price;
  }

  // Otherwise calculate from base product
  if (baseProduct && packingProduct.base_unit_quantity) {
    return roundPrice(
      baseProduct.selling_price * packingProduct.base_unit_quantity
    );
  }

  // Fallback to packing's price
  return packingProduct.selling_price;
}

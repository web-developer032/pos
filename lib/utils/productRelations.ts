import { Product } from "@/lib/api/productsApi";
import { roundPrice } from "./formHelpers";

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
 * Get effective stock for packing (from base product)
 * Note: This is a client-side utility. For server-side, use the API.
 */
export function getEffectiveStock(
  packingProduct: Product,
  baseProductStock?: number
): number {
  if (packingProduct.product_type !== 'packing' || !packingProduct.base_product_id) {
    return packingProduct.stock_quantity;
  }
  
  if (baseProductStock === undefined) {
    // If base product stock is not provided, return packing's own stock
    return packingProduct.stock_quantity;
  }
  
  // Convert base stock to packing units
  const baseUnitQuantity = packingProduct.base_unit_quantity || 1;
  return baseProductStock / baseUnitQuantity;
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


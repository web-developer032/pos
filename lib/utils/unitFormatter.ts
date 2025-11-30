import type { ProductUnit } from "@/lib/api/productsApi";

/**
 * Format quantity with unit for display
 */
export function formatQuantityWithUnit(
  quantity: number,
  unit: ProductUnit = "piece"
): string {
  // Format the number (remove unnecessary decimals for whole numbers)
  const formattedQuantity =
    quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(2);

  // Get unit label
  const unitLabel = getUnitLabel(unit);

  return `${formattedQuantity} ${unitLabel}`;
}

/**
 * Get display label for unit
 */
export function getUnitLabel(unit: ProductUnit = "piece"): string {
  const unitLabels: Record<ProductUnit, string> = {
    piece: "pcs",
    gram: "g",
    kilogram: "kg",
    liter: "L",
    milliliter: "mL",
  };

  return unitLabels[unit] || unit;
}

/**
 * Get full unit name for display
 */
export function getUnitFullName(unit: ProductUnit = "piece"): string {
  const unitNames: Record<ProductUnit, string> = {
    piece: "Piece",
    gram: "Gram",
    kilogram: "Kilogram",
    liter: "Liter",
    milliliter: "Milliliter",
  };

  return unitNames[unit] || unit;
}

/**
 * Calculate profit percentage from cost and selling prices
 * @param costPrice - The cost price of the product
 * @param sellingPrice - The selling price of the product
 * @returns The profit percentage, or null if calculation is not possible
 */
export function calculateProfitPercentage(
  costPrice: number | string | null | undefined,
  sellingPrice: number | string | null | undefined
): number | null {
  // Convert to numbers, handling strings and null/undefined
  const cost = typeof costPrice === "string" ? parseFloat(costPrice) : costPrice;
  const selling =
    typeof sellingPrice === "string" ? parseFloat(sellingPrice) : sellingPrice;

  // Validate inputs
  if (
    cost === null ||
    cost === undefined ||
    selling === null ||
    selling === undefined ||
    isNaN(cost) ||
    isNaN(selling) ||
    cost <= 0 ||
    selling < 0
  ) {
    return null;
  }

  // Calculate profit percentage: ((selling - cost) / cost) * 100
  const profitPercentage = ((selling - cost) / cost) * 100;
  return profitPercentage;
}

/**
 * Format profit percentage for display
 * @param profitPercentage - The profit percentage value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with sign prefix
 */
export function formatProfitPercentage(
  profitPercentage: number,
  decimals: number = 2
): string {
  const sign = profitPercentage >= 0 ? "+" : "";
  return `${sign}${profitPercentage.toFixed(decimals)}%`;
}


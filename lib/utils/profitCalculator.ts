/**
 * Utility functions for profit calculations
 */

/**
 * Calculate profit percentage from cost and selling price
 * @param costPrice - Cost price
 * @param sellingPrice - Selling price
 * @returns Profit percentage (e.g., 25.5 for 25.5%) or null if invalid
 */
export function calculateProfitPercentage(
  costPrice: number | string | null | undefined,
  sellingPrice: number | string | null | undefined
): number | null {
  const cost =
    typeof costPrice === "string" ? parseFloat(costPrice) : costPrice;
  const selling =
    typeof sellingPrice === "string" ? parseFloat(sellingPrice) : sellingPrice;

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
  const profitPercentage = ((selling - cost) / cost) * 100;
  return profitPercentage;
}

/**
 * Format profit percentage number to string
 * @param profitPercentage - Profit percentage as number (e.g., 25.5 for 25.5%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., "+25.50%")
 */
export function formatProfitPercentage(
  profitPercentage: number,
  decimals: number = 2
): string {
  const sign = profitPercentage >= 0 ? "+" : "";
  return `${sign}${profitPercentage.toFixed(decimals)}%`;
}

/**
 * Calculate profit for a single sale item
 * @param unitPrice - Selling price per unit
 * @param costPrice - Cost price per unit
 * @param quantity - Quantity sold
 * @returns Total profit for the item
 */
export function calculateItemProfit(
  unitPrice: number,
  costPrice: number,
  quantity: number
): number {
  const profitPerUnit = unitPrice - costPrice;
  return profitPerUnit * quantity;
}

/**
 * Calculate total profit from sale items
 * @param items - Array of sale items with unit_price, cost_price, and quantity
 * @returns Total profit
 */
export function calculateTotalProfit(
  items: Array<{
    unit_price: number;
    cost_price: number;
    quantity: number;
  }>
): number {
  return items.reduce((total, item) => {
    return (
      total +
      calculateItemProfit(item.unit_price, item.cost_price, item.quantity)
    );
  }, 0);
}

/**
 * Calculate profit margin percentage from profit and revenue
 * @param profit - Profit amount
 * @param revenue - Revenue amount
 * @returns Profit margin percentage as string
 */
export function calculateProfitMargin(profit: number, revenue: number): string {
  if (revenue === 0) return "0.00%";
  const percentage = (profit / revenue) * 100;
  return `${percentage.toFixed(2)}%`;
}

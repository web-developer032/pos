/**
 * Utility functions for profit calculations
 */

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
    return total + calculateItemProfit(item.unit_price, item.cost_price, item.quantity);
  }, 0);
}

/**
 * Format profit percentage
 * @param profit - Profit amount
 * @param revenue - Revenue amount
 * @returns Profit percentage as string
 */
export function formatProfitPercentage(profit: number, revenue: number): string {
  if (revenue === 0) return "0.00%";
  const percentage = (profit / revenue) * 100;
  return `${percentage.toFixed(2)}%`;
}

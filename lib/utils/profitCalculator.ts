/**
 * Calculate profit percentage from cost and selling price
 * @param costPrice - Cost price per unit
 * @param sellingPrice - Selling price per unit
 * @returns Profit percentage or null if invalid
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
 * Format profit percentage for display
 * @param profitPercentage - Profit percentage value
 * @param decimals - Number of decimal places
 * @returns Formatted string with sign
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

/**
 * Calculate net profit for a sale after accounting for returns
 * This is the SQL expression to calculate net profit considering returns
 * @returns SQL expression string
 */
export function getNetProfitSQLExpression(): string {
  return `
    COALESCE(
      (SELECT SUM((si.unit_price - si.cost_price) * si.quantity)
       FROM sale_items si
       WHERE si.sale_id = s.id)
      -
      COALESCE(
        (SELECT SUM((ri.unit_price - si.cost_price) * ri.quantity)
         FROM return_items ri
         JOIN returns r ON ri.return_id = r.id
         JOIN sale_items si ON ri.sale_item_id = si.id
         WHERE r.sale_id = s.id),
        0
      ),
      0
    )
  `;
}

/**
 * Calculate net profit for analytics/reports after accounting for returns
 * This is the SQL expression for aggregated profit calculations
 * @returns SQL expression string
 */
export function getNetProfitAggregateSQLExpression(): string {
  return `
    COALESCE(
      SUM((si.unit_price - si.cost_price) * si.quantity)
      -
      COALESCE(
        (SELECT SUM((ri.unit_price - si2.cost_price) * ri.quantity)
         FROM return_items ri
         JOIN returns r ON ri.return_id = r.id
         JOIN sale_items si2 ON ri.sale_item_id = si2.id
         WHERE r.sale_id = s.id),
        0
      ),
      0
    )
  `;
}

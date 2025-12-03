import { format } from "date-fns";
import type { DateRange } from "@/components/common/DateRangeSelector";

/**
 * Format date string for chart display
 * Handles different date formats: YYYY-MM-DD, YYYY-MM, YYYY-WWW
 */
export function formatChartDate(dateStr: string): string {
  try {
    if (dateStr.includes("-W")) {
      // Week format: YYYY-WWW
      return dateStr;
    } else if (dateStr.match(/^\d{4}-\d{2}$/)) {
      // Month format: YYYY-MM
      return format(new Date(dateStr + "-01"), "MMM yyyy");
    } else {
      // Day format: YYYY-MM-DD
      return format(new Date(dateStr), "MMM dd");
    }
  } catch {
    return dateStr;
  }
}

/**
 * Get chart title based on date range and chart type
 */
export function getChartTitle(
  chartType: "sales" | "expenses",
  dateRange?: DateRange
): string {
  const chartName =
    chartType === "sales" ? "Sales & Profit Trend" : "Expenses Trend";

  if (!dateRange) {
    return `${chartName} (Last 7 Days)`;
  }

  switch (dateRange.type) {
    case "day":
      return `${chartName} (This Day)`;
    case "week":
      return `${chartName} (This Week)`;
    case "month":
      return `${chartName} (This Month)`;
    case "custom":
      return `${chartName} (Selected Period)`;
    default:
      return chartName;
  }
}

/**
 * Group expenses by date and format for chart
 */
export function groupExpensesByDate(
  expenses: Array<{ created_at: string; amount: number }>
): Array<{ date: string; expenses: number }> {
  // Group by date
  const expensesByDate = expenses.reduce(
    (acc, expense) => {
      const dateStr = expense.created_at.split(" ")[0]; // Get YYYY-MM-DD
      acc[dateStr] = (acc[dateStr] || 0) + expense.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  // Convert to chart data format and sort by date
  return Object.entries(expensesByDate)
    .map(([date, amount]) => ({
      date: formatChartDate(date),
      originalDate: date,
      expenses: parseFloat(amount.toFixed(2)),
    }))
    .sort(
      (a, b) =>
        new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime()
    )
    .map(({ originalDate: _originalDate, ...rest }) => rest);
}


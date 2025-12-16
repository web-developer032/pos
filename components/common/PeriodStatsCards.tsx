"use client";

import { useGetSalesAnalyticsQuery } from "@/lib/api/salesApi";
import { useGetExpensesQuery, useGetOtherIncomeQuery } from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import type { DateRange } from "@/components/common/DateRangeSelector";
import { getDateRangeLabelPossessive } from "@/lib/utils/dateRangeHelpers";

export interface PeriodStatsCardsProps {
  dateRange?: DateRange;
  showExpenses?: boolean;
  showOtherIncome?: boolean;
  showProfitMargin?: boolean;
  showAverageOrder?: boolean;
  compact?: boolean;
  className?: string;
}

export function PeriodStatsCards({
  dateRange,
  showExpenses = true,
  showOtherIncome = false,
  showProfitMargin = false,
  showAverageOrder = true,
  compact = false,
  className = "",
}: PeriodStatsCardsProps) {
  const { data, isLoading } = useGetSalesAnalyticsQuery({
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
    groupBy: "day",
  });
  const { data: expensesData, isLoading: isLoadingExpenses } =
    useGetExpensesQuery({
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
    });
  const { data: otherIncomeData, isLoading: isLoadingOtherIncome } =
    useGetOtherIncomeQuery({
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
    });
  const { format: formatCurrency } = useCurrency();

  const isLoadingAny =
    isLoading ||
    (showExpenses && isLoadingExpenses) ||
    (showOtherIncome && isLoadingOtherIncome);

  if (isLoadingAny) {
    return (
      <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 ${className}`}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg bg-gray-200"
          ></div>
        ))}
      </div>
    );
  }

  const summary = data?.summary || {
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageOrderValue: 0,
    profitMargin: "0.00",
  };

  const label = getDateRangeLabelPossessive(dateRange);
  const totalExpenses = expensesData?.summary.total_expenses || 0;
  const totalOtherIncome = otherIncomeData?.summary.total_income || 0;

  const padding = compact ? "p-4" : "p-6";
  const titleSize = compact ? "text-xs sm:text-sm" : "text-sm";
  const valueSize = compact ? "text-xl sm:text-2xl" : "text-3xl";

  // Calculate number of cards to show
  const cardCount =
    3 +
    (showExpenses ? 1 : 0) +
    (showOtherIncome ? 1 : 0) +
    (showProfitMargin || showAverageOrder ? 1 : 0);
  const gridCols =
    cardCount <= 4
      ? "grid-cols-2 sm:grid-cols-4"
      : cardCount <= 5
        ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6";

  return (
    <div className={`grid ${gridCols} gap-4 ${className}`}>
      <div className={`rounded-lg bg-white ${padding} shadow`}>
        <h3 className={`${titleSize} font-medium text-gray-500`}>
          {label} Revenue
        </h3>
        <p className={`mt-1 ${valueSize} font-bold`}>
          {formatCurrency(summary.totalRevenue)}
        </p>
      </div>
      <div className={`rounded-lg bg-white ${padding} shadow`}>
        <h3 className={`${titleSize} font-medium text-gray-500`}>
          {label} Profit
        </h3>
        <p className={`mt-1 ${valueSize} font-bold text-green-600`}>
          {formatCurrency(summary.totalProfit)}
        </p>
      </div>
      {showOtherIncome && (
        <div className={`rounded-lg bg-white ${padding} shadow`}>
          <h3 className={`${titleSize} font-medium text-gray-500`}>
            {label} Other Income
          </h3>
          <p className={`mt-1 ${valueSize} font-bold text-emerald-600`}>
            {formatCurrency(totalOtherIncome)}
          </p>
        </div>
      )}
      {showExpenses && (
        <div className={`rounded-lg bg-white ${padding} shadow`}>
          <h3 className={`${titleSize} font-medium text-gray-500`}>
            {label} Expenses
          </h3>
          <p className={`mt-1 ${valueSize} font-bold text-red-600`}>
            {formatCurrency(totalExpenses)}
          </p>
        </div>
      )}
      <div className={`rounded-lg bg-white ${padding} shadow`}>
        <h3 className={`${titleSize} font-medium text-gray-500`}>
          {label} Sales
        </h3>
        <p className={`mt-1 ${valueSize} font-bold`}>{summary.totalSales}</p>
      </div>
      {showProfitMargin && (
        <div className={`rounded-lg bg-white ${padding} shadow`}>
          <h3 className={`${titleSize} font-medium text-gray-500`}>
            Profit Margin
          </h3>
          <p className={`mt-1 ${valueSize} font-bold text-indigo-600`}>
            {summary.profitMargin}%
          </p>
        </div>
      )}
      {showAverageOrder && !showProfitMargin && (
        <div className={`rounded-lg bg-white ${padding} shadow`}>
          <h3 className={`${titleSize} font-medium text-gray-500`}>
            Average Order
          </h3>
          <p className={`mt-1 ${valueSize} font-bold`}>
            {formatCurrency(summary.averageOrderValue)}
          </p>
        </div>
      )}
    </div>
  );
}


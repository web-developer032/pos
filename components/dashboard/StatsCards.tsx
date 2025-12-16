"use client";

import { useGetSalesAnalyticsQuery } from "@/lib/api/salesApi";
import { useGetExpensesQuery } from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import type { DateRange } from "@/components/common/DateRangeSelector";
import { getDateRangeLabelPossessive } from "@/lib/utils/dateRangeHelpers";

interface StatsCardsProps {
  dateRange?: DateRange;
}

export function StatsCards({ dateRange }: StatsCardsProps) {
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
  const { format: formatCurrency } = useCurrency();

  if (isLoading || isLoadingExpenses) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-gray-200"
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
  };

  const label = getDateRangeLabelPossessive(dateRange);
  const totalExpenses = expensesData?.summary.total_expenses || 0;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">{label} Revenue</h3>
        <p className="mt-2 text-3xl font-bold">
          {formatCurrency(summary.totalRevenue)}
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">{label} Profit</h3>
        <p className="mt-2 text-3xl font-bold text-green-600">
          {formatCurrency(summary.totalProfit)}
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">{label} Expenses</h3>
        <p className="mt-2 text-3xl font-bold text-red-600">
          {formatCurrency(totalExpenses)}
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">{label} Orders</h3>
        <p className="mt-2 text-3xl font-bold">{summary.totalSales}</p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">Average Order</h3>
        <p className="mt-2 text-3xl font-bold">
          {formatCurrency(summary.averageOrderValue)}
        </p>
      </div>
    </div>
  );
}

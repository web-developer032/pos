"use client";

import { useGetSalesQuery } from "@/lib/api/salesApi";
import { useGetExpensesQuery } from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import type { DateRange } from "@/components/common/DateRangeSelector";

interface StatsCardsProps {
  dateRange?: DateRange;
}

export function StatsCards({ dateRange }: StatsCardsProps) {
  const { data, isLoading } = useGetSalesQuery({
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });
  const { data: expensesData, isLoading: isLoadingExpenses } =
    useGetExpensesQuery({
      startDate: dateRange?.startDate,
      endDate: dateRange?.endDate,
    });
  const { format: formatCurrency } = useCurrency();

  if (isLoading || isLoadingExpenses) {
    return <div>Loading stats...</div>;
  }

  const sales = data?.sales || [];
  const revenue = sales.reduce(
    (sum, sale) => sum + (sale.final_amount || 0),
    0
  );
  const profit = sales.reduce((sum, sale) => sum + (sale.total_profit || 0), 0);
  const orders = sales.length;

  const getLabel = () => {
    if (!dateRange) return "Today's";
    switch (dateRange.type) {
      case "day":
        return "This Day's";
      case "week":
        return "This Week's";
      case "month":
        return "This Month's";
      case "custom":
        return "Selected Period's";
      default:
        return "Today's";
    }
  };

  const totalExpenses = expensesData?.summary.total_expenses || 0;

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">
          {getLabel()} Revenue
        </h3>
        <p className="mt-2 text-3xl font-bold">{formatCurrency(revenue)}</p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">
          {getLabel()} Profit
        </h3>
        <p className="mt-2 text-3xl font-bold text-green-600">
          {formatCurrency(profit)}
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">
          {getLabel()} Expenses
        </h3>
        <p className="mt-2 text-3xl font-bold text-red-600">
          {formatCurrency(totalExpenses)}
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">
          {getLabel()} Orders
        </h3>
        <p className="mt-2 text-3xl font-bold">{orders}</p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">Average Order</h3>
        <p className="mt-2 text-3xl font-bold">
          {formatCurrency(orders > 0 ? revenue / orders : 0)}
        </p>
      </div>
    </div>
  );
}

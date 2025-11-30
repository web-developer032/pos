"use client";

import { useGetSalesQuery } from "@/lib/api/salesApi";
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
  const { format: formatCurrency } = useCurrency();

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  const sales = data?.sales || [];
  const revenue = sales.reduce(
    (sum, sale) => sum + (sale.final_amount || 0),
    0
  );
  const orders = sales.length;

  const getLabel = () => {
    if (!dateRange) return "Today's";
    switch (dateRange.type) {
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

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">
          {getLabel()} Revenue
        </h3>
        <p className="mt-2 text-3xl font-bold">{formatCurrency(revenue)}</p>
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

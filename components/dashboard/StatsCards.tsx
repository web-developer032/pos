"use client";

import { useGetSalesQuery } from "@/lib/api/salesApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { format } from "date-fns";

export function StatsCards() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, isLoading } = useGetSalesQuery({
    startDate: today,
    endDate: today,
  });
  const { format: formatCurrency } = useCurrency();

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  const todaySales = data?.sales || [];
  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + (sale.final_amount || 0),
    0
  );
  const todayOrders = todaySales.length;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">
          Today&apos;s Revenue
        </h3>
        <p className="mt-2 text-3xl font-bold ">
          {formatCurrency(todayRevenue)}
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">
          Today&apos;s Orders
        </h3>
        <p className="mt-2 text-3xl font-bold ">{todayOrders}</p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">Average Order</h3>
        <p className="mt-2 text-3xl font-bold ">
          {formatCurrency(todayOrders > 0 ? todayRevenue / todayOrders : 0)}
        </p>
      </div>
    </div>
  );
}

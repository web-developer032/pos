"use client";

import { useGetSalesQuery } from "@/lib/api/salesApi";
import { format, startOfDay, endOfDay } from "date-fns";

export function StatsCards() {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, isLoading } = useGetSalesQuery({
    startDate: today,
    endDate: today,
  });

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-gray-500 text-sm font-medium">Today's Revenue</h3>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          ${todayRevenue.toFixed(2)}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-gray-500 text-sm font-medium">Today's Orders</h3>
        <p className="text-3xl font-bold text-gray-900 mt-2">{todayOrders}</p>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-gray-500 text-sm font-medium">Average Order</h3>
        <p className="text-3xl font-bold text-gray-900 mt-2">
          ${todayOrders > 0 ? (todayRevenue / todayOrders).toFixed(2) : "0.00"}
        </p>
      </div>
    </div>
  );
}


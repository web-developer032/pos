"use client";

import { useGetSalesQuery } from "@/lib/api/salesApi";
import { format } from "date-fns";

export function RecentSales() {
  const { data, isLoading } = useGetSalesQuery();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
        <div>Loading...</div>
      </div>
    );
  }

  const recentSales = data?.sales.slice(0, 5) || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
      <div className="space-y-2">
        {recentSales.map((sale) => (
          <div key={sale.id} className="flex justify-between items-center border-b pb-2">
            <div>
              <p className="text-sm font-medium">{sale.sale_number}</p>
              <p className="text-xs text-gray-500">
                {format(new Date(sale.created_at), "MMM dd, yyyy HH:mm")}
              </p>
            </div>
            <span className="font-semibold">${sale.final_amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


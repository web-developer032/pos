"use client";

import { useGetSalesQuery } from "@/lib/api/salesApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { format } from "date-fns";

export function RecentSales() {
  const { data, isLoading } = useGetSalesQuery();
  const { format: formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Recent Sales</h3>
        <div>Loading...</div>
      </div>
    );
  }

  const recentSales = data?.sales.slice(0, 5) || [];

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold">Recent Sales</h3>
      <div className="space-y-2">
        {recentSales.map((sale) => (
          <div
            key={sale.id}
            className="flex items-center justify-between border-b pb-2"
          >
            <div>
              <p className="text-sm font-medium">{sale.sale_number}</p>
              <p className="text-xs text-gray-500">
                {format(new Date(sale.created_at), "MMM dd, yyyy HH:mm")}
              </p>
            </div>
            <span className="font-semibold">
              {formatCurrency(sale.final_amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

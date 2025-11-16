"use client";

import { useGetSalesQuery } from "@/lib/api/salesApi";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function SalesChart() {
  const startDate = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const { data, isLoading } = useGetSalesQuery({
    startDate,
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Sales Trend (Last 7 Days)</h3>
        <div>Loading...</div>
      </div>
    );
  }

  const salesByDate: { [key: string]: number } = {};
  data?.sales.forEach((sale) => {
    const date = format(new Date(sale.created_at), "yyyy-MM-dd");
    salesByDate[date] = (salesByDate[date] || 0) + sale.final_amount;
  });

  const chartData = Object.entries(salesByDate).map(([date, revenue]) => ({
    date: format(new Date(date), "MMM dd"),
    revenue: revenue.toFixed(2),
  }));

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Sales Trend (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="revenue" stroke="#4f46e5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


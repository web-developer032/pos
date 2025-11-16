"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetSalesQuery } from "@/lib/api/salesApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ReportsPage() {
  const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const { data, isLoading } = useGetSalesQuery({
    startDate,
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const { format: formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div>Loading...</div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const salesByDate: { [key: string]: number } = {};
  data?.sales.forEach((sale) => {
    const date = format(new Date(sale.created_at), "yyyy-MM-dd");
    salesByDate[date] = (salesByDate[date] || 0) + sale.final_amount;
  });

  const chartData = Object.entries(salesByDate).map(([date, revenue]) => ({
    date: format(new Date(date), "MMM dd"),
    revenue: parseFloat(revenue.toFixed(2)),
  }));

  const totalRevenue =
    data?.sales.reduce((sum, sale) => sum + sale.final_amount, 0) || 0;
  const totalSales = data?.sales.length || 0;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Total Revenue (30 days)
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Total Sales (30 days)
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalSales}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Average Order Value
            </h3>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {formatCurrency(totalSales > 0 ? totalRevenue / totalSales : 0)}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">
            Revenue Trend (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="#4f46e5" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

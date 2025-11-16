"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetSalesQuery } from "@/lib/api/salesApi";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ReportsPage() {
  const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const { data, isLoading } = useGetSalesQuery({
    startDate,
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

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

  const totalRevenue = data?.sales.reduce((sum, sale) => sum + sale.final_amount, 0) || 0;
  const totalSales = data?.sales.length || 0;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Revenue (30 days)</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Sales (30 days)</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalSales}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Average Order Value</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              ${totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : "0.00"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trend (Last 30 Days)</h3>
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
      </ProtectedRoute>
    </ProtectedRoute>
  );
}


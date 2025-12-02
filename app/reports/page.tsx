"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetSalesQuery } from "@/lib/api/salesApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import {
  DateRangeSelector,
  type DateRange,
} from "@/components/common/DateRangeSelector";
import { format } from "date-fns";
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
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: "",
    endDate: "",
    type: "month",
  });

  const { data, isLoading } = useGetSalesQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
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

  const chartData = Object.entries(salesByDate)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, revenue]) => ({
      date: format(new Date(date), "MMM dd"),
      revenue: parseFloat(revenue.toFixed(2)),
    }));

  const totalRevenue =
    data?.sales.reduce((sum, sale) => sum + sale.final_amount, 0) || 0;
  const totalSales = data?.sales.length || 0;

  const getDateRangeLabel = () => {
    switch (dateRange.type) {
      case "day":
        return "This Day";
      case "week":
        return "This Week";
      case "month":
        return "This Month";
      case "custom":
        return `${format(new Date(dateRange.startDate), "MMM dd")} - ${format(new Date(dateRange.endDate), "MMM dd")}`;
      default:
        return "Selected Period";
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Reports</h1>
        </div>

        <div className="mb-6">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Total Revenue ({getDateRangeLabel()})
            </h3>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Total Sales ({getDateRangeLabel()})
            </h3>
            <p className="mt-2 text-3xl font-bold">{totalSales}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Average Order Value
            </h3>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(totalSales > 0 ? totalRevenue / totalSales : 0)}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">
            Revenue Trend ({getDateRangeLabel()})
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

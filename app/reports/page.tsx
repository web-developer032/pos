"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetSalesAnalyticsQuery } from "@/lib/api/salesApi";
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
  Legend,
} from "recharts";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: "",
    endDate: "",
    type: "month",
  });

  const groupBy =
    dateRange.type === "month"
      ? "day"
      : dateRange.type === "week"
        ? "day"
        : "day";
  const { data, isLoading } = useGetSalesAnalyticsQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    groupBy: groupBy as "day" | "week" | "month",
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

  const chartData = (data?.data || []).map((item) => {
    const dateStr = item.date as string;
    let formattedDate = dateStr;
    try {
      if (dateStr.includes("-W")) {
        formattedDate = dateStr;
      } else if (dateStr.match(/^\d{4}-\d{2}$/)) {
        formattedDate = format(new Date(dateStr + "-01"), "MMM yyyy");
      } else {
        formattedDate = format(new Date(dateStr), "MMM dd");
      }
    } catch {
      formattedDate = dateStr;
    }
    return {
      date: formattedDate,
      revenue: parseFloat((item.total_revenue as number).toFixed(2)),
      profit: parseFloat((item.total_profit as number).toFixed(2)),
    };
  });

  const summary = data?.summary || {
    totalSales: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageOrderValue: 0,
    profitMargin: "0.00",
  };

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

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Total Revenue ({getDateRangeLabel()})
            </h3>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(summary.totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Total Profit ({getDateRangeLabel()})
            </h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {formatCurrency(summary.totalProfit)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Total Sales ({getDateRangeLabel()})
            </h3>
            <p className="mt-2 text-3xl font-bold">{summary.totalSales}</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">Profit Margin</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">
              {summary.profitMargin}%
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold">
            Revenue & Profit Trend ({getDateRangeLabel()})
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#4f46e5" name="Revenue" />
              <Bar dataKey="profit" fill="#10b981" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

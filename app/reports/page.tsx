"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetSalesAnalyticsQuery } from "@/lib/api/salesApi";
import {
  useGetExpensesQuery,
  useGetFinanceSummaryQuery,
} from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import {
  DateRangeSelector,
  type DateRange,
} from "@/components/common/DateRangeSelector";
import { ExpensesChart } from "@/components/dashboard/ExpensesChart";
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
import { formatChartDate } from "@/lib/utils/chartHelpers";
import { ChartTooltip } from "@/components/common/ChartTooltip";

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
  const { data: expensesData, isLoading: isLoadingExpenses } =
    useGetExpensesQuery({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  const { data: financeSummary, isLoading: isLoadingFinanceSummary } =
    useGetFinanceSummaryQuery();
  const { format: formatCurrency } = useCurrency();

  if (isLoading || isLoadingExpenses || isLoadingFinanceSummary) {
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
    return {
      date: formatChartDate(dateStr),
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

        {/* All Time Summary */}
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          <div className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white shadow">
            <h3 className="text-sm font-medium text-blue-100">
              All Time Revenue
            </h3>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(financeSummary?.total_revenue || 0)}
            </p>
            <p className="mt-1 text-xs text-blue-100">Total from all sales</p>
          </div>
          <div className="rounded-lg bg-gradient-to-r from-green-500 to-green-600 p-6 text-white shadow">
            <h3 className="text-sm font-medium text-green-100">
              All Time Profit
            </h3>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(financeSummary?.total_profit || 0)}
            </p>
            <p className="mt-1 text-xs text-green-100">Total profit earned</p>
          </div>
        </div>

        <div className="mb-6">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>

        {/* Period Summary */}
        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Revenue ({getDateRangeLabel()})
            </h3>
            <p className="mt-2 text-3xl font-bold">
              {formatCurrency(summary.totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Profit ({getDateRangeLabel()})
            </h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {formatCurrency(summary.totalProfit)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Expenses ({getDateRangeLabel()})
            </h3>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {formatCurrency(expensesData?.summary.total_expenses || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Sales ({getDateRangeLabel()})
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

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">
              Revenue & Profit Trend ({getDateRangeLabel()})
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="revenue" fill="#4f46e5" name="Revenue" />
                <Bar dataKey="profit" fill="#10b981" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ExpensesChart dateRange={dateRange} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

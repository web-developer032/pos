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
import { AllTimeSummaryCards } from "@/components/common/AllTimeSummaryCards";
import { PeriodStatsCards } from "@/components/common/PeriodStatsCards";
import { ExpensesChart } from "@/components/dashboard/ExpensesChart";
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
import { getDateRangeLabel } from "@/lib/utils/dateRangeHelpers";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: "",
    endDate: "",
    type: "month",
  });

  const { data, isLoading } = useGetSalesAnalyticsQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    groupBy: "day",
  });

  const chartData = (data?.data || []).map((item) => ({
    date: formatChartDate(item.date as string),
    revenue: parseFloat((item.total_revenue as number).toFixed(2)),
    profit: parseFloat((item.total_profit as number).toFixed(2)),
  }));

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Reports</h1>
        </div>

        {/* All Time Summary */}
        <AllTimeSummaryCards className="mb-6" showOtherIncome />

        {/* Date Range Filter */}
        <div className="mb-6">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>

        {/* Period Summary */}
        <PeriodStatsCards
          dateRange={dateRange}
          showExpenses={true}
          showOtherIncome={true}
          showProfitMargin={true}
          showAverageOrder={false}
          className="mb-6"
        />

        {/* Charts */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold">
              Revenue & Profit Trend ({getDateRangeLabel(dateRange, "full")})
            </h3>
            {isLoading ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="text-gray-500">Loading chart...</div>
              </div>
            ) : (
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
            )}
          </div>
          <ExpensesChart dateRange={dateRange} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

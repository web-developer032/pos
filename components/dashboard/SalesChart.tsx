"use client";

import { useGetSalesAnalyticsQuery } from "@/lib/api/salesApi";
import type { DateRange } from "@/components/common/DateRangeSelector";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getChartTitle, formatChartDate } from "@/lib/utils/chartHelpers";
import { ChartTooltip } from "@/components/common/ChartTooltip";

interface SalesChartProps {
  dateRange?: DateRange;
}

export function SalesChart({ dateRange }: SalesChartProps) {
  const groupBy =
    dateRange?.type === "month"
      ? "day"
      : dateRange?.type === "week"
        ? "day"
        : "day";
  const { data, isLoading } = useGetSalesAnalyticsQuery({
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
    groupBy: groupBy as "day" | "week" | "month",
  });

  const title = getChartTitle("sales", dateRange);

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        <div>Loading...</div>
      </div>
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

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip content={<ChartTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#4f46e5"
            name="Revenue"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#10b981"
            name="Profit"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

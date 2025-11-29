"use client";

import { useGetSalesQuery } from "@/lib/api/salesApi";
import { format } from "date-fns";
import type { DateRange } from "@/components/common/DateRangeSelector";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SalesChartProps {
  dateRange?: DateRange;
}

export function SalesChart({ dateRange }: SalesChartProps) {
  const { data, isLoading } = useGetSalesQuery({
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });

  const getTitle = () => {
    if (!dateRange) return "Sales Trend (Last 7 Days)";
    switch (dateRange.type) {
      case "week":
        return "Sales Trend (This Week)";
      case "month":
        return "Sales Trend (This Month)";
      case "custom":
        return "Sales Trend (Selected Period)";
      default:
        return "Sales Trend";
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">{getTitle()}</h3>
        <div>Loading...</div>
      </div>
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
      revenue: revenue.toFixed(2),
    }));

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold">{getTitle()}</h3>
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

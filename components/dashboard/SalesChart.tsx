"use client";

import { useGetSalesAnalyticsQuery } from "@/lib/api/salesApi";
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
  Legend,
} from "recharts";

interface SalesChartProps {
  dateRange?: DateRange;
}

export function SalesChart({ dateRange }: SalesChartProps) {
  const groupBy = dateRange?.type === "month" ? "day" : dateRange?.type === "week" ? "day" : "day";
  const { data, isLoading } = useGetSalesAnalyticsQuery({
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
    groupBy: groupBy as "day" | "week" | "month",
  });

  const getTitle = () => {
    if (!dateRange) return "Sales & Profit Trend (Last 7 Days)";
    switch (dateRange.type) {
      case "day":
        return "Sales & Profit Trend (This Day)";
      case "week":
        return "Sales & Profit Trend (This Week)";
      case "month":
        return "Sales & Profit Trend (This Month)";
      case "custom":
        return "Sales & Profit Trend (Selected Period)";
      default:
        return "Sales & Profit Trend";
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

  const chartData = (data?.data || []).map((item) => {
    const dateStr = item.date as string;
    let formattedDate = dateStr;
    try {
      if (dateStr.includes("-W")) {
        // Week format: YYYY-WWW
        formattedDate = dateStr;
      } else if (dateStr.match(/^\d{4}-\d{2}$/)) {
        // Month format: YYYY-MM
        formattedDate = format(new Date(dateStr + "-01"), "MMM yyyy");
      } else {
        // Day format: YYYY-MM-DD
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

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold">{getTitle()}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
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

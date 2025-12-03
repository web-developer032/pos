"use client";

import { useGetExpensesQuery } from "@/lib/api/financeApi";
import { format } from "date-fns";
import type { DateRange } from "@/components/common/DateRangeSelector";
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
import { useCurrency } from "@/lib/hooks/useCurrency";

interface ExpensesChartProps {
  dateRange?: DateRange;
}

export function ExpensesChart({ dateRange }: ExpensesChartProps) {
  const { data, isLoading } = useGetExpensesQuery({
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });
  const { format: formatCurrency } = useCurrency();

  const getTitle = () => {
    if (!dateRange) return "Expenses Trend (Last 7 Days)";
    switch (dateRange.type) {
      case "day":
        return "Expenses Trend (This Day)";
      case "week":
        return "Expenses Trend (This Week)";
      case "month":
        return "Expenses Trend (This Month)";
      case "custom":
        return "Expenses Trend (Selected Period)";
      default:
        return "Expenses Trend";
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

  // Group expenses by date
  const expensesByDate = (data?.expenses || []).reduce(
    (acc, expense) => {
      const dateStr = expense.created_at.split(" ")[0]; // Get YYYY-MM-DD
      if (!acc[dateStr]) {
        acc[dateStr] = 0;
      }
      acc[dateStr] += expense.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  // Convert to chart data format and sort by date
  const chartData = Object.entries(expensesByDate)
    .map(([date, amount]) => {
      let formattedDate = date;
      try {
        formattedDate = format(new Date(date), "MMM dd");
      } catch {
        formattedDate = date;
      }
      return {
        date: formattedDate,
        originalDate: date, // Keep original for sorting
        expenses: parseFloat(amount.toFixed(2)),
      };
    })
    .sort((a, b) => {
      // Sort by original date
      return (
        new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime()
      );
    })
    .map(({ originalDate: _originalDate, ...rest }) => rest); // Remove originalDate from final data

  // Custom tooltip formatter
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="font-medium">{payload[0].payload.date}</p>
          <p className="text-red-600">
            Expenses: {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold">{getTitle()}</h3>
      {chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-gray-500">
          No expenses data for the selected period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={customTooltip} />
            <Legend />
            <Bar
              dataKey="expenses"
              fill="#ef4444"
              name="Expenses"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

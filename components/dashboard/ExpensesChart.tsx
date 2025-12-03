"use client";

import { useGetExpensesQuery } from "@/lib/api/financeApi";
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
import { getChartTitle, groupExpensesByDate } from "@/lib/utils/chartHelpers";
import { ChartTooltip } from "@/components/common/ChartTooltip";

interface ExpensesChartProps {
  dateRange?: DateRange;
}

export function ExpensesChart({ dateRange }: ExpensesChartProps) {
  const { data, isLoading } = useGetExpensesQuery({
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
  });

  const title = getChartTitle("expenses", dateRange);

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        <div>Loading...</div>
      </div>
    );
  }

  const chartData = groupExpensesByDate(data?.expenses || []);

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
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
            <Tooltip content={<ChartTooltip />} />
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

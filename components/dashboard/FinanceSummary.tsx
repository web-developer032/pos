"use client";

import { useGetFinanceSummaryQuery } from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useAppSelector } from "@/lib/hooks";
import Link from "next/link";

export function FinanceSummary() {
  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading } = useGetFinanceSummaryQuery();
  const { format: formatCurrency } = useCurrency();

  // Only show for admin and manager
  if (!user || !["admin", "manager"].includes(user.role)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg bg-gray-200"
          ></div>
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Financial Overview</h2>
        <Link
          href="/finance"
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Manage Finance →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">Total Capital</div>
          <div
            className={`mt-2 text-2xl font-bold ${
              data.total_capital >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(data.total_capital)}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Investments - Withdrawals
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">Total Profit</div>
          <div
            className={`mt-2 text-2xl font-bold ${
              data.total_profit >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(data.total_profit)}
          </div>
          <div className="mt-1 text-xs text-gray-400">From all sales</div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">
            Total Expenses
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600">
            {formatCurrency(data.total_expenses)}
          </div>
          <div className="mt-1 text-xs text-gray-400">All time expenses</div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">Net Balance</div>
          <div
            className={`mt-2 text-2xl font-bold ${
              data.net_balance >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(data.net_balance)}
          </div>
          <div className="mt-1 text-xs text-gray-400">Capital + Profit - Expenses</div>
        </div>
      </div>
    </div>
  );
}

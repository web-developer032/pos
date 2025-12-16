"use client";

import { useGetFinanceSummaryQuery } from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";

interface AllTimeSummaryCardsProps {
  className?: string;
  compact?: boolean;
}

export function AllTimeSummaryCards({
  className = "",
  compact = false,
}: AllTimeSummaryCardsProps) {
  const { data: financeSummary, isLoading } = useGetFinanceSummaryQuery();
  const { format: formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${className}`}>
        <div className="h-24 animate-pulse rounded-lg bg-blue-200"></div>
        <div className="h-24 animate-pulse rounded-lg bg-green-200"></div>
      </div>
    );
  }

  const padding = compact ? "p-4" : "p-6";
  const valueSize = compact ? "text-2xl" : "text-3xl";

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${className}`}>
      <div
        className={`rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 ${padding} text-white shadow`}
      >
        <h3 className="text-sm font-medium text-blue-100">All Time Revenue</h3>
        <p className={`mt-1 ${valueSize} font-bold`}>
          {formatCurrency(financeSummary?.total_revenue || 0)}
        </p>
        <p className="mt-1 text-xs text-blue-100">Total from all sales</p>
      </div>
      <div
        className={`rounded-lg bg-gradient-to-r from-green-500 to-green-600 ${padding} text-white shadow`}
      >
        <h3 className="text-sm font-medium text-green-100">All Time Profit</h3>
        <p className={`mt-1 ${valueSize} font-bold`}>
          {formatCurrency(financeSummary?.total_profit || 0)}
        </p>
        <p className="mt-1 text-xs text-green-100">Total profit earned</p>
      </div>
    </div>
  );
}


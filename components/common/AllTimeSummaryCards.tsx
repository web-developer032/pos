"use client";

import { useGetFinanceSummaryQuery } from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";

interface AllTimeSummaryCardsProps {
  className?: string;
  compact?: boolean;
  showOtherIncome?: boolean;
}

export function AllTimeSummaryCards({
  className = "",
  compact = false,
  showOtherIncome = false,
}: AllTimeSummaryCardsProps) {
  const { data: financeSummary, isLoading } = useGetFinanceSummaryQuery();
  const { format: formatCurrency } = useCurrency();

  const gridCols = showOtherIncome
    ? "grid-cols-1 sm:grid-cols-3"
    : "grid-cols-1 sm:grid-cols-2";

  if (isLoading) {
    return (
      <div className={`grid ${gridCols} gap-4 ${className}`}>
        <div className="h-24 animate-pulse rounded-lg bg-blue-200"></div>
        <div className="h-24 animate-pulse rounded-lg bg-green-200"></div>
        {showOtherIncome && (
          <div className="h-24 animate-pulse rounded-lg bg-emerald-200"></div>
        )}
      </div>
    );
  }

  const padding = compact ? "p-4" : "p-6";
  const valueSize = compact ? "text-2xl" : "text-3xl";

  return (
    <div className={`grid ${gridCols} gap-4 ${className}`}>
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
      {showOtherIncome && (
        <div
          className={`rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 ${padding} text-white shadow`}
        >
          <h3 className="text-sm font-medium text-emerald-100">All Time Other Income</h3>
          <p className={`mt-1 ${valueSize} font-bold`}>
            {formatCurrency(financeSummary?.total_other_income || 0)}
          </p>
          <p className="mt-1 text-xs text-emerald-100">Misc. income earned</p>
        </div>
      )}
    </div>
  );
}


"use client";

import {
  calculateProfitPercentage,
  formatProfitPercentage,
} from "@/lib/utils/profitCalculator";

interface ProfitPercentageProps {
  costPrice: number | string | null | undefined;
  sellingPrice: number | string | null | undefined;
  variant?: "inline" | "card";
  showLabel?: boolean;
  label?: string;
  className?: string;
}

/**
 * Reusable component for displaying profit percentage
 * @param costPrice - The cost price of the product
 * @param sellingPrice - The selling price of the product
 * @param variant - Display variant: "inline" for simple text, "card" for styled card
 * @param showLabel - Whether to show a label (only for card variant)
 * @param label - Custom label text (default: "Profit Margin:")
 * @param className - Additional CSS classes
 */
export function ProfitPercentage({
  costPrice,
  sellingPrice,
  variant = "inline",
  showLabel = false,
  label = "Profit Margin:",
  className = "",
}: ProfitPercentageProps) {
  const profitPercentage = calculateProfitPercentage(costPrice, sellingPrice);

  // Return null if calculation is not possible
  if (profitPercentage === null) {
    if (variant === "card") {
      return null;
    }
    return <span className={`text-gray-400 ${className}`}>-</span>;
  }

  const isProfit = profitPercentage >= 0;
  const formattedPercentage = formatProfitPercentage(profitPercentage);

  // Inline variant (for tables, lists)
  if (variant === "inline") {
    return (
      <span
        className={`font-semibold ${
          isProfit ? "text-green-600" : "text-red-600"
        } ${className}`}
      >
        {formattedPercentage}
      </span>
    );
  }

  // Card variant (for forms, detailed views)
  return (
    <div
      className={`rounded-lg border p-3 ${
        isProfit ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        {showLabel && (
          <span className="text-sm font-medium text-gray-700">{label}</span>
        )}
        <span
          className={`text-lg font-semibold ${
            isProfit ? "text-green-700" : "text-red-700"
          }`}
        >
          {formattedPercentage}
        </span>
      </div>
      {!isProfit && (
        <p className="mt-1 text-xs text-red-600">
          Warning: Selling price is below cost price
        </p>
      )}
    </div>
  );
}

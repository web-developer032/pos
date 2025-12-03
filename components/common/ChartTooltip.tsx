"use client";

import { useCurrency } from "@/lib/hooks/useCurrency";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: Record<string, unknown>;
    dataKey?: string;
    name?: string;
  }>;
  label?: string;
  formatter?: (value: number, name: string) => [string, string];
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: ChartTooltipProps) {
  const { format: formatCurrency } = useCurrency();

  if (!active || !payload || !payload.length) {
    return null;
  }

  const defaultFormatter = (value: number, name: string) => [
    formatCurrency(value),
    name,
  ];

  const format = formatter || defaultFormatter;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      {label && <p className="mb-2 font-medium">{label}</p>}
      {payload.map((entry, index) => {
        const [formattedValue, displayName] = format(
          entry.value,
          entry.name || entry.dataKey || "Value"
        );
        return (
          <p
            key={index}
            className={
              entry.dataKey === "expenses" || entry.name === "Expenses"
                ? "text-red-600"
                : entry.dataKey === "profit" || entry.name === "Profit"
                  ? "text-green-600"
                  : "text-gray-900"
            }
          >
            {displayName}: {formattedValue}
          </p>
        );
      })}
    </div>
  );
}


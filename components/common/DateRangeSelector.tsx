"use client";

import { useState, useEffect } from "react";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

export type DateRangeType = "week" | "month" | "custom";

export interface DateRange {
  startDate: string;
  endDate: string;
  type: DateRangeType;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

export function DateRangeSelector({
  value,
  onChange,
  className = "",
}: DateRangeSelectorProps) {
  const [type, setType] = useState<DateRangeType>(value.type || "week");
  const [customStartDate, setCustomStartDate] = useState(
    value.type === "custom"
      ? value.startDate
      : format(subDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [customEndDate, setCustomEndDate] = useState(
    value.type === "custom" ? value.endDate : format(new Date(), "yyyy-MM-dd")
  );

  // Calculate dates based on type
  const getDateRange = (
    rangeType: DateRangeType,
    customStart?: string,
    customEnd?: string
  ): DateRange => {
    const today = new Date();
    let startDate: string;
    let endDate: string;

    switch (rangeType) {
      case "week":
        startDate = format(
          startOfWeek(today, { weekStartsOn: 1 }),
          "yyyy-MM-dd"
        );
        endDate = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
        break;
      case "month":
        startDate = format(startOfMonth(today), "yyyy-MM-dd");
        endDate = format(endOfMonth(today), "yyyy-MM-dd");
        break;
      case "custom":
        startDate = customStart || format(subDays(today, 7), "yyyy-MM-dd");
        endDate = customEnd || format(today, "yyyy-MM-dd");
        break;
      default:
        startDate = format(subDays(today, 7), "yyyy-MM-dd");
        endDate = format(today, "yyyy-MM-dd");
    }

    return { startDate, endDate, type: rangeType };
  };

  // Initialize on mount
  useEffect(() => {
    if (!value.startDate || !value.endDate) {
      const defaultRange = getDateRange(type);
      onChange(defaultRange);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update when type changes
  useEffect(() => {
    if (type !== "custom") {
      const range = getDateRange(type);
      onChange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Update when custom dates change
  useEffect(() => {
    if (type === "custom" && customStartDate && customEndDate) {
      onChange({
        startDate: customStartDate,
        endDate: customEndDate,
        type: "custom",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customStartDate, customEndDate, type]);

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-end ${className}`}
    >
      <div className="w-full sm:w-48">
        <Select
          label="Date Range"
          value={type}
          onChange={(e) => setType(e.target.value as DateRangeType)}
          options={[
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
            { value: "custom", label: "Custom Range" },
          ]}
        />
      </div>
      {type === "custom" && (
        <>
          <div className="w-full sm:w-40">
            <Input
              label="Start Date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-40">
            <Input
              label="End Date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  );
}

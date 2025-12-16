import { format } from "date-fns";
import type { DateRange } from "@/components/common/DateRangeSelector";

/**
 * Get a human-readable label for a date range
 */
export function getDateRangeLabel(
  dateRange: DateRange,
  style: "short" | "full" = "short"
): string {
  switch (dateRange.type) {
    case "day":
      return style === "full" ? "This Day" : "Today";
    case "week":
      return "This Week";
    case "month":
      return "This Month";
    case "custom":
      if (dateRange.startDate && dateRange.endDate) {
        return `${format(new Date(dateRange.startDate), "MMM dd")} - ${format(new Date(dateRange.endDate), "MMM dd")}`;
      }
      return "Selected Period";
    default:
      return "Selected Period";
  }
}

/**
 * Get label with possessive form (e.g., "This Week's")
 */
export function getDateRangeLabelPossessive(dateRange?: DateRange): string {
  if (!dateRange) return "Today's";
  switch (dateRange.type) {
    case "day":
      return "This Day's";
    case "week":
      return "This Week's";
    case "month":
      return "This Month's";
    case "custom":
      return "Selected Period's";
    default:
      return "Today's";
  }
}


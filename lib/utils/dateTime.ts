import { format, parseISO, isValid } from "date-fns";

/**
 * Centralized date/time utility for the application
 * Handles timezone-aware date operations consistently
 */

/**
 * Get the current timestamp in UTC (ISO 8601 format)
 * Returns format: YYYY-MM-DDTHH:MM:SS.sssZ (UTC/ISO format for consistent storage)
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Parse a database timestamp string to a Date object
 * New timestamps are stored in UTC (ISO format with Z suffix)
 * Old timestamps without timezone are treated as UTC for consistency
 * @param timestamp - Database timestamp string (ISO format or legacy YYYY-MM-DD HH:MM:SS)
 */
export function parseDatabaseTimestamp(timestamp: string | Date): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // If it's already an ISO string with timezone info, parse it directly
  if (
    timestamp.includes("Z") ||
    timestamp.includes("+", 10) ||
    /\d{2}:\d{2}:\d{2}[+-]/.test(timestamp)
  ) {
    return parseISO(timestamp);
  }

  // Legacy format: "YYYY-MM-DD HH:MM:SS" without timezone
  // Treat as UTC for consistency (append Z)
  const isoString = timestamp.replace(" ", "T") + "Z";
  const date = new Date(isoString);

  if (!isValid(date)) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }

  return date;
}

/**
 * Format a date for display with date and time
 * @param date - Date string, Date object, or database timestamp
 * @param options - Formatting options
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  options?: {
    includeSeconds?: boolean;
    hour12?: boolean;
  }
): string {
  if (!date) return "-";

  try {
    const dateObj = parseDatabaseTimestamp(date);
    if (!isValid(dateObj)) return "-";

    const formatStr =
      options?.hour12 !== false
        ? `dd MMM yyyy, h:mm${options?.includeSeconds ? ":ss" : ""} a`
        : `dd MMM yyyy, HH:mm${options?.includeSeconds ? ":ss" : ""}`;

    return format(dateObj, formatStr);
  } catch {
    return "-";
  }
}

/**
 * Format a date for display (date only, no time)
 * @param date - Date string, Date object, or database timestamp
 */
export function formatDateOnly(date: string | Date | null | undefined): string {
  if (!date) return "-";

  try {
    const dateObj = parseDatabaseTimestamp(date);
    if (!isValid(dateObj)) return "-";

    return format(dateObj, "dd MMM yyyy");
  } catch {
    return "-";
  }
}

/**
 * Format time only (no date)
 * @param date - Date string, Date object, or database timestamp
 * @param options - Formatting options
 */
export function formatTimeOnly(
  date: string | Date | null | undefined,
  options?: {
    includeSeconds?: boolean;
    hour12?: boolean;
  }
): string {
  if (!date) return "-";

  try {
    const dateObj = parseDatabaseTimestamp(date);
    if (!isValid(dateObj)) return "-";

    const formatStr =
      options?.hour12 !== false
        ? `h:mm${options?.includeSeconds ? ":ss" : ""} a`
        : `HH:mm${options?.includeSeconds ? ":ss" : ""}`;

    return format(dateObj, formatStr);
  } catch {
    return "-";
  }
}

/**
 * Format date for database storage (YYYY-MM-DD in UTC)
 */
export function formatDateForDatabase(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format datetime for database storage (ISO 8601 UTC format)
 */
export function formatDateTimeForDatabase(date: Date): string {
  return date.toISOString();
}

/**
 * Get start of day in local timezone (for date range queries)
 * Returns UTC timestamp for the start of the local day
 */
export function getStartOfDay(date: Date = new Date()): string {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

/**
 * Get end of day in local timezone (for date range queries)
 * Returns UTC timestamp for the end of the local day
 */
export function getEndOfDay(date: Date = new Date()): string {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

/**
 * Check if a date string is today
 */
export function isToday(date: string | Date | null | undefined): boolean {
  if (!date) return false;

  try {
    const dateObj = parseDatabaseTimestamp(date);
    const today = new Date();
    return (
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
}

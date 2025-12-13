import { format, parseISO, isValid } from "date-fns";

/**
 * Centralized date/time utility for the application
 * Handles timezone-aware date operations consistently
 */

/**
 * Get the current timestamp in UTC (matches SQLite's CURRENT_TIMESTAMP)
 * Returns format: YYYY-MM-DD HH:MM:SS (for SQLite DATETIME)
 */
export function getCurrentTimestamp(): string {
  const now = new Date();
  // Format in UTC to match SQLite's CURRENT_TIMESTAMP behavior
  return now.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Parse a database timestamp string to a Date object
 * SQLite's CURRENT_TIMESTAMP stores time in UTC
 * @param timestamp - Database timestamp string (YYYY-MM-DD HH:MM:SS in UTC)
 */
export function parseDatabaseTimestamp(timestamp: string | Date): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // If it's already an ISO string with timezone, parse it directly
  if (
    timestamp.includes("Z") ||
    timestamp.includes("+") ||
    timestamp.includes("-", 10)
  ) {
    return parseISO(timestamp);
  }

  // Database stores in UTC format: "YYYY-MM-DD HH:MM:SS"
  // SQLite's CURRENT_TIMESTAMP returns UTC time
  // Convert to ISO string with Z suffix to properly parse as UTC
  const isoString = timestamp.replace(" ", "T") + "Z";
  const date = parseISO(isoString);

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
 * Format date for database storage (YYYY-MM-DD)
 */
export function formatDateForDatabase(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Format datetime for database storage (YYYY-MM-DD HH:MM:SS)
 */
export function formatDateTimeForDatabase(date: Date): string {
  return format(date, "yyyy-MM-dd HH:mm:ss");
}

/**
 * Get start of day in local timezone (for date range queries)
 */
export function getStartOfDay(date: Date = new Date()): string {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return formatDateTimeForDatabase(start);
}

/**
 * Get end of day in local timezone (for date range queries)
 */
export function getEndOfDay(date: Date = new Date()): string {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return formatDateTimeForDatabase(end);
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

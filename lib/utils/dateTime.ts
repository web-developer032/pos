import { format, parseISO, isValid } from "date-fns";

/**
 * Centralized date/time utility for the application
 * Handles timezone-aware date operations consistently
 */

/**
 * Get the current timestamp in the server's local timezone
 * Returns format: YYYY-MM-DD HH:MM:SS (for SQLite DATETIME)
 */
export function getCurrentTimestamp(): string {
  const now = new Date();
  return format(now, "yyyy-MM-dd HH:mm:ss");
}


/**
 * Parse a database timestamp string to a Date object
 * Assumes the timestamp is stored in local time (not UTC)
 * @param timestamp - Database timestamp string (YYYY-MM-DD HH:MM:SS)
 */
export function parseDatabaseTimestamp(timestamp: string | Date): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // If it's already an ISO string with timezone, parse it directly
  if (timestamp.includes("Z") || timestamp.includes("+") || timestamp.includes("-", 10)) {
    return parseISO(timestamp);
  }

  // Database stores in local time format: "YYYY-MM-DD HH:MM:SS"
  // Parse it as local time by creating a Date object directly
  // This ensures we don't accidentally treat it as UTC
  const [datePart, timePart] = timestamp.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes, seconds = 0] = (timePart || "00:00:00").split(":").map(Number);
  
  // Create date in local timezone (month is 0-indexed in Date constructor)
  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  
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

    const formatStr = options?.hour12 !== false
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

    const formatStr = options?.hour12 !== false
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


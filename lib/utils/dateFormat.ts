/**
 * Formats a date using the system's locale and timezone
 * Handles UTC dates from database by treating them as UTC
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatSystemDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  let dateObj: Date;

  if (typeof date === "string") {
    // If the string doesn't have timezone info, treat it as UTC
    // Database stores times in UTC, so we need to parse them as UTC
    if (!date.includes("Z") && !date.includes("+") && !date.includes("-", 10)) {
      // Format: "2025-11-23 19:54:00" - treat as UTC
      dateObj = new Date(date + "Z");
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: undefined, // Use system timezone
  };

  const formatter = new Intl.DateTimeFormat(undefined, {
    ...defaultOptions,
    ...options,
  });

  return formatter.format(dateObj);
}

/**
 * Formats a date for display (date only, no time)
 */
export function formatSystemDateOnly(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
  };

  const formatter = new Intl.DateTimeFormat(undefined, {
    ...defaultOptions,
    ...options,
  });

  return formatter.format(dateObj);
}

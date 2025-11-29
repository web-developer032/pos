/**
 * Convert string or number to number, handling empty strings and undefined
 */
export function toNumber(
  value: string | number | undefined | null,
  defaultValue?: number
): number | undefined {
  if (value === "" || value === null || value === undefined) {
    return defaultValue;
  }
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Convert string or number to integer
 */
export function toInt(
  value: string | number | undefined | null,
  defaultValue = 0
): number {
  const num = toNumber(value, defaultValue);
  return num !== undefined ? Math.floor(num) : defaultValue;
}

/**
 * Convert string or number to float
 */
export function toFloat(
  value: string | number | undefined | null,
  defaultValue = 0
): number {
  const num = toNumber(value, defaultValue);
  return num !== undefined ? num : defaultValue;
}

/**
 * Validate number is non-negative
 */
export function validateNonNegative(
  value: number,
  fieldName: string
): { valid: boolean; error?: string } {
  if (isNaN(value) || value < 0) {
    return {
      valid: false,
      error: `${fieldName} is required and must be >= 0`,
    };
  }
  return { valid: true };
}

/**
 * Convert optional string/number ID to number or undefined
 */
export function toOptionalId(
  value: string | number | undefined | null
): number | undefined {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}


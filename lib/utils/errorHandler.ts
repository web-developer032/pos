import toast from "react-hot-toast";

/**
 * Standard error structure from RTK Query mutations
 */
interface MutationError {
  status?: number;
  data?: {
    error?: string;
    message?: string;
  };
  error?: string;
  message?: string;
}

/**
 * Extract error message from RTK Query mutation error
 * Handles various error formats from the API
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  const err = error as MutationError;
  return (
    err?.data?.error ||
    err?.data?.message ||
    err?.error ||
    err?.message ||
    fallback
  );
}

/**
 * Handle mutation error with toast notification
 * Use this in catch blocks for RTK Query mutations
 */
export function handleMutationError(
  error: unknown,
  fallbackMessage: string
): void {
  const message = getErrorMessage(error, fallbackMessage);
  toast.error(message);
}

/**
 * Handle mutation success with toast notification
 */
export function handleMutationSuccess(message: string): void {
  toast.success(message);
}


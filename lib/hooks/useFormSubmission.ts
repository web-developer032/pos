import { useState, useCallback } from "react";
import toast from "react-hot-toast";

interface UseFormSubmissionOptions<T> {
  onSubmit: (data: T) => Promise<unknown>;
  onSuccess?: (result: unknown) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Custom hook for handling form submission with loading state and error handling
 * Optimized to prevent double submissions
 */
export function useFormSubmission<T>({
  onSubmit,
  onSuccess,
  successMessage = "Operation completed successfully",
  errorMessage = "Operation failed",
}: UseFormSubmissionOptions<T>) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (data: T) => {
      if (isSubmitting) return; // Prevent double submission

      setIsSubmitting(true);
      try {
        const result = await onSubmit(data);
        toast.success(successMessage);
        onSuccess?.(result);
        return result;
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : (error as { data?: { error?: string } })?.data?.error ||
              errorMessage;
        toast.error(errorMsg);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, onSuccess, successMessage, errorMessage, isSubmitting]
  );

  return {
    handleSubmit,
    isSubmitting,
  };
}


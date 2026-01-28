"use client";

import { useEffect, useCallback, useRef } from "react";
import { FieldErrors, FieldValues } from "react-hook-form";
import toast from "react-hot-toast";

interface UseScrollToErrorOptions {
  /** Show a toast notification with the error summary */
  showToast?: boolean;
  /** Custom offset from top when scrolling (default: 100px) */
  scrollOffset?: number;
  /** Behavior of scroll animation */
  scrollBehavior?: ScrollBehavior;
  /** Container element to scroll within (default: document) */
  containerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Recursively finds the first error in a nested errors object
 */
function findFirstError(
  errors: FieldErrors,
  path: string[] = []
): { path: string[]; message: string } | null {
  for (const key in errors) {
    const error = errors[key];
    if (!error) continue;

    const currentPath = [...path, key];

    // Handle array errors (like items.0.product_id)
    if (typeof error === "object" && !("message" in error)) {
      // Could be a nested object or array
      const nestedResult = findFirstError(
        error as FieldErrors,
        currentPath
      );
      if (nestedResult) return nestedResult;
    }

    // Found an actual error with a message
    if (error.message && typeof error.message === "string") {
      return { path: currentPath, message: error.message };
    }
  }
  return null;
}

/**
 * Counts total errors in a nested errors object
 */
function countErrors(errors: FieldErrors): number {
  let count = 0;
  for (const key in errors) {
    const error = errors[key];
    if (!error) continue;

    if (typeof error === "object" && !("message" in error)) {
      count += countErrors(error as FieldErrors);
    } else if (error.message) {
      count++;
    }
  }
  return count;
}

/**
 * Hook to automatically scroll to the first form error when validation fails.
 * Also shows a toast notification summarizing the errors.
 *
 * @example
 * const { formState: { errors }, handleSubmit } = useForm();
 * useScrollToError(errors, { showToast: true });
 */
export function useScrollToError<T extends FieldValues>(
  errors: FieldErrors<T>,
  options: UseScrollToErrorOptions = {}
) {
  const {
    showToast = true,
    scrollOffset = 100,
    scrollBehavior = "smooth",
    containerRef,
  } = options;

  // Track if we've already handled these errors
  const lastErrorKey = useRef<string>("");

  const scrollToFirstError = useCallback(() => {
    const firstError = findFirstError(errors);
    if (!firstError) return;

    // Create a unique key for this error to avoid duplicate processing
    const errorKey = `${firstError.path.join(".")}-${firstError.message}`;
    if (errorKey === lastErrorKey.current) return;
    lastErrorKey.current = errorKey;

    // Find the input element by name
    const fieldName = firstError.path.join(".");
    const element =
      document.querySelector(`[name="${fieldName}"]`) ||
      document.querySelector(`[data-field-name="${fieldName}"]`) ||
      // Try to find by partial match for array fields (items.0.product_id)
      document.querySelector(`[name^="${firstError.path[0]}"]`);

    if (element) {
      // Find the closest parent that contains the error (usually a form group)
      const container =
        element.closest(".form-group") ||
        element.closest(".space-y-1") ||
        element.closest(".mb-4") ||
        element.parentElement;

      const targetElement = container || element;

      // Scroll to the element
      if (containerRef?.current) {
        // Scroll within a container
        const containerRect = containerRef.current.getBoundingClientRect();
        const targetRect = targetElement.getBoundingClientRect();
        const relativeTop = targetRect.top - containerRect.top;

        containerRef.current.scrollTo({
          top: containerRef.current.scrollTop + relativeTop - scrollOffset,
          behavior: scrollBehavior,
        });
      } else {
        // Scroll the whole document
        const elementRect = targetElement.getBoundingClientRect();
        const absoluteTop = elementRect.top + window.scrollY;

        window.scrollTo({
          top: absoluteTop - scrollOffset,
          behavior: scrollBehavior,
        });
      }

      // Focus the input if possible
      if (element instanceof HTMLElement && "focus" in element) {
        setTimeout(() => {
          (element as HTMLInputElement).focus();
        }, 300);
      }
    }

    // Show toast with error summary
    if (showToast) {
      const totalErrors = countErrors(errors);
      const message =
        totalErrors > 1
          ? `Please fix ${totalErrors} errors in the form`
          : firstError.message;
      toast.error(message, { id: "form-validation-error" });
    }
  }, [errors, containerRef, scrollBehavior, scrollOffset, showToast]);

  useEffect(() => {
    // Only run when there are errors
    if (Object.keys(errors).length > 0) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(scrollToFirstError, 50);
      return () => clearTimeout(timer);
    } else {
      // Reset the error key when errors are cleared
      lastErrorKey.current = "";
    }
  }, [errors, scrollToFirstError]);

  return { scrollToFirstError };
}

/**
 * Helper function to scroll to a specific element by name
 */
export function scrollToElement(
  name: string,
  options: { offset?: number; behavior?: ScrollBehavior } = {}
) {
  const { offset = 100, behavior = "smooth" } = options;
  const element = document.querySelector(`[name="${name}"]`);

  if (element) {
    const elementRect = element.getBoundingClientRect();
    const absoluteTop = elementRect.top + window.scrollY;

    window.scrollTo({
      top: absoluteTop - offset,
      behavior,
    });

    if (element instanceof HTMLElement && "focus" in element) {
      setTimeout(() => {
        (element as HTMLInputElement).focus();
      }, 300);
    }
  }
}


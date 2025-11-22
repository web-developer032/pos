import { useRef, useCallback } from "react";

/**
 * Custom hook to prevent double-clicking on buttons that trigger API calls
 * Uses a loading state to prevent multiple simultaneous calls
 * @param callback - The async function to protect
 * @returns Protected callback function and loading state
 */
export function usePreventDoubleClick<
  T extends (...args: unknown[]) => Promise<unknown>,
>(callback: T): [T, boolean] {
  const isLoadingRef = useRef(false);

  const protectedCallback = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      if (isLoadingRef.current) {
        return Promise.reject(
          new Error("Operation already in progress")
        ) as ReturnType<T>;
      }

      isLoadingRef.current = true;
      try {
        const result = await callback(...args);
        return result as ReturnType<T>;
      } finally {
        isLoadingRef.current = false;
      }
    },
    [callback]
  ) as T;

  return [protectedCallback, isLoadingRef.current];
}

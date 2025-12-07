"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  useGetProductByBarcodeQuery,
  type Product,
} from "@/lib/api/productsApi";
import toast from "react-hot-toast";

// ==========================================
// Type Definitions
// ==========================================

interface BarcodeScanState {
  index: number;
  barcode: string;
}

interface POSScannerOptions {
  onScanComplete?: () => void;
}

interface UseBarcodeHandlerOptions {
  onProductFound: (index: number, product: Product) => void;
  onProductNotFound: (index: number) => void;
  inputRefs: React.MutableRefObject<{ [key: number]: HTMLInputElement | null }>;
}

// ==========================================
// Helper Functions
// ==========================================

// Detect if input is a barcode
function isBarcode(value: string): boolean {
  const trimmed = value.trim();
  // Numeric barcodes (6+ digits) or alphanumeric (8+ chars)
  return (
    (trimmed.length >= 6 && /^[0-9]+$/.test(trimmed)) ||
    (trimmed.length >= 8 && /^[0-9A-Za-z]+$/.test(trimmed))
  );
}

// ==========================================
// Hooks
// ==========================================

/**
 * Barcode scanner for POS page and product forms
 * Returns { scanBarcode, isBarcodePattern }
 */
export function useBarcodeScanner(options?: POSScannerOptions) {
  const processedBarcodesRef = useRef<Set<string>>(new Set());

  const scanBarcode = useCallback(
    (barcode: string) => {
      const trimmed = barcode.trim();
      if (trimmed && !processedBarcodesRef.current.has(trimmed)) {
        processedBarcodesRef.current.add(trimmed);

        // Trigger scan complete callback
        options?.onScanComplete?.();

        // Clean up after delay
        setTimeout(() => {
          processedBarcodesRef.current.delete(trimmed);
        }, 200);
      }
    },
    [options]
  );

  // Check if a string looks like a barcode
  const isBarcodePattern = useCallback((value: string) => {
    return isBarcode(value);
  }, []);

  return { scanBarcode, isBarcodePattern };
}

/**
 * Form barcode scanner for purchase orders and other forms
 * Returns utilities for handling barcode input in forms with multiple items
 */
export function useFormBarcodeScanner() {
  const [barcodeToScan, setBarcodeToScan] = useState<BarcodeScanState | null>(
    null
  );
  const processedBarcodesRef = useRef<Set<string>>(new Set());

  const handleBarcodeKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const value = e.currentTarget.value.trim();
        if (isBarcode(value) && !processedBarcodesRef.current.has(value)) {
          e.preventDefault();
          setBarcodeToScan({ index, barcode: value });
        }
      }
    },
    []
  );

  const clearBarcodeState = useCallback(() => {
    setBarcodeToScan(null);
  }, []);

  return {
    barcodeToScan,
    processedBarcodes: processedBarcodesRef.current,
    handleBarcodeKeyDown,
    setBarcodeToScan,
    clearBarcodeState,
  };
}

export function useBarcodeHandler(
  barcodeToScan: BarcodeScanState | null,
  options: UseBarcodeHandlerOptions
) {
  const { onProductFound, onProductNotFound, inputRefs } = options;
  const processedBarcodesRef = useRef<Set<string>>(new Set());

  const {
    data: barcodeProductData,
    error: barcodeError,
    isLoading: isBarcodeLoading,
  } = useGetProductByBarcodeQuery(barcodeToScan?.barcode || "", {
    skip: !barcodeToScan?.barcode,
  });

  useEffect(() => {
    if (!barcodeToScan) return;

    const { index, barcode } = barcodeToScan;

    // Skip if already processed
    if (processedBarcodesRef.current.has(barcode)) {
      return;
    }

    // Handle successful product found
    if (barcodeProductData?.product) {
      const product = barcodeProductData.product;
      const matchesPrimaryBarcode = product.barcode === barcode;
      const matchesAdditionalBarcode =
        product.additional_barcodes?.includes(barcode) || false;

      if (matchesPrimaryBarcode || matchesAdditionalBarcode) {
        processedBarcodesRef.current.add(barcode);
        onProductFound(index, product);

        // Clear input
        requestAnimationFrame(() => {
          const input = inputRefs.current[index];
          if (input) {
            input.value = "";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.blur();
          }
        });

        toast.success(`${product.name} selected`);

        // Clean up after delay
        setTimeout(() => {
          processedBarcodesRef.current.delete(barcode);
        }, 200);
      }
      return;
    }

    // Handle error case
    if (barcodeError && !isBarcodeLoading) {
      processedBarcodesRef.current.add(barcode);
      onProductNotFound(index);

      requestAnimationFrame(() => {
        const input = inputRefs.current[index];
        if (input) {
          input.value = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.blur();
        }
      });

      toast.error("Product not found");

      setTimeout(() => {
        processedBarcodesRef.current.delete(barcode);
      }, 100);
    }
  }, [
    barcodeToScan,
    barcodeProductData,
    barcodeError,
    isBarcodeLoading,
    onProductFound,
    onProductNotFound,
    inputRefs,
  ]);
}

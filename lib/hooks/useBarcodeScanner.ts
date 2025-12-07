"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  useGetProductByBarcodeQuery,
  type Product,
} from "@/lib/api/productsApi";
import toast from "react-hot-toast";

interface BarcodeScanState {
  index: number;
  barcode: string;
}

interface UseBarcodeScanner {
  barcodeToScan: BarcodeScanState | null;
  processedBarcodes: Set<string>;
  handleBarcodeKeyDown: (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => void;
  setBarcodeToScan: (state: BarcodeScanState | null) => void;
  clearBarcodeState: () => void;
}

interface UseBarcodeHandlerOptions {
  onProductFound: (index: number, product: Product) => void;
  onProductNotFound: (index: number) => void;
  inputRefs: React.MutableRefObject<{ [key: number]: HTMLInputElement | null }>;
}

// Detect if input is a barcode
function isBarcode(value: string): boolean {
  const trimmed = value.trim();
  // Numeric barcodes (6+ digits) or alphanumeric (8+ chars)
  return (
    (trimmed.length >= 6 && /^[0-9]+$/.test(trimmed)) ||
    (trimmed.length >= 8 && /^[0-9A-Za-z]+$/.test(trimmed))
  );
}

export function useBarcodeScanner(): UseBarcodeScanner {
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

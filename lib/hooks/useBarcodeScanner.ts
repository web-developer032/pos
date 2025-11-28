import { useState, useRef, useEffect, useCallback } from "react";
import { useAppDispatch } from "@/lib/hooks";
import { addItem } from "@/lib/slices/cartSlice";
import { useGetProductByBarcodeQuery } from "@/lib/api/productsApi";
import toast from "react-hot-toast";

interface UseBarcodeScannerOptions {
  onScanComplete?: () => void;
}

/**
 * Custom hook for handling barcode scanning
 * Optimized for fast product lookup and cart addition
 */
export function useBarcodeScanner(options: UseBarcodeScannerOptions = {}) {
  const { onScanComplete } = options;
  const dispatch = useAppDispatch();
  const [barcodeToScan, setBarcodeToScan] = useState<string | null>(null);
  const processedBarcodesRef = useRef<Set<string>>(new Set());

  // Query product by barcode - optimized with skip
  const {
    data: barcodeProductData,
    error: barcodeError,
    isLoading,
  } = useGetProductByBarcodeQuery(barcodeToScan || "", {
    skip: !barcodeToScan,
  });

  // Handle barcode scan result - optimized to run only when needed
  useEffect(() => {
    if (!barcodeToScan) return;

    const barcode = barcodeToScan;

    // Skip if already processed
    if (processedBarcodesRef.current.has(barcode)) {
      return;
    }

    if (barcodeProductData?.product) {
      const product = barcodeProductData.product;

      // Mark as processed immediately to prevent duplicates
      processedBarcodesRef.current.add(barcode);

      // Add to cart immediately (optimistic)
      dispatch(
        addItem({
          product_id: product.id,
          name: product.name,
          price: product.selling_price,
          quantity: 1,
          stock_quantity: product.stock_quantity,
        })
      );

      toast.success(`${product.name} added to cart`, { duration: 1500 });

      // Clear and reset
      setBarcodeToScan(null);
      onScanComplete?.();

      // Clean up processed barcode after a short delay
      setTimeout(() => {
        processedBarcodesRef.current.delete(barcode);
      }, 500);
    } else if (barcodeError && !isLoading) {
      // Mark as processed even on error
      processedBarcodesRef.current.add(barcode);

      toast.error("Product not found", { duration: 1500 });
      setBarcodeToScan(null);
      onScanComplete?.();

      // Clean up after delay
      setTimeout(() => {
        processedBarcodesRef.current.delete(barcode);
      }, 500);
    }
  }, [
    barcodeProductData,
    barcodeError,
    barcodeToScan,
    isLoading,
    dispatch,
    onScanComplete,
  ]);

  // Scan barcode function
  const scanBarcode = useCallback((barcode: string) => {
    const trimmed = barcode.trim();
    if (trimmed && !processedBarcodesRef.current.has(trimmed)) {
      setBarcodeToScan(trimmed);
    }
  }, []);

  // Check if input looks like a barcode
  const isBarcodePattern = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    return (
      (trimmed.length >= 8 && /^[0-9A-Za-z]+$/.test(trimmed)) || // Long alphanumeric
      (trimmed.length >= 6 && /^[0-9]+$/.test(trimmed)) // Numeric barcode
    );
  }, []);

  return {
    scanBarcode,
    isBarcodePattern,
    isScanning: isLoading && !!barcodeToScan,
  };
}

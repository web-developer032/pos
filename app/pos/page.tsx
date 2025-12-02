"use client";

import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { setCustomer, setDiscount, setTax } from "@/lib/slices/cartSlice";
import { useGetCustomersQuery } from "@/lib/api/customersApi";
import { useBarcodeScanner } from "@/lib/hooks/useBarcodeScanner";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

export default function POSPage() {
  const dispatch = useAppDispatch();
  const { items, customerId, discount, tax } = useAppSelector(
    (state) => state.cart
  );
  const { data: customersData } = useGetCustomersQuery();
  const { format: formatCurrency } = useCurrency();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
  const finalTotal = subtotal - discount + tax;

  // Use optimized barcode scanner hook
  const { scanBarcode } = useBarcodeScanner({
    onScanComplete: () => {
      setBarcodeInput("");
      // Refocus immediately for next scan
      requestAnimationFrame(() => {
        barcodeInputRef.current?.focus();
      });
    },
  });

  // Handle barcode input (scanners send Enter after barcode)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      e.preventDefault();
      scanBarcode(barcodeInput);
    }
  };

  // Auto-focus barcode input when modal closes
  useEffect(() => {
    if (!isPaymentModalOpen) {
      requestAnimationFrame(() => {
        barcodeInputRef.current?.focus();
      });
    }
  }, [isPaymentModalOpen]);

  return (
    <ProtectedRoute allowedRoles={["admin", "cashier", "manager"]}>
      <DashboardLayout>
        {/* Price Summary Bar - Top Section (Sticky) */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Subtotal
              </span>
              <span className="mt-1.5 text-xl font-bold text-gray-900 sm:text-2xl">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Discount
              </span>
              <span className="mt-1.5 text-xl font-bold text-red-600 sm:text-2xl">
                -{formatCurrency(discount)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Tax
              </span>
              <span className="mt-1.5 text-xl font-bold text-gray-900 sm:text-2xl">
                {formatCurrency(tax)}
              </span>
            </div>
            <div className="col-span-2 flex flex-col border-t-2 border-indigo-300 pt-3 sm:col-span-1 sm:border-l-2 sm:border-t-0 sm:border-indigo-300 sm:pl-6 sm:pt-0">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Total Amount
              </span>
              <span className="mt-1.5 text-2xl font-bold text-indigo-600 sm:text-3xl">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Barcode Scanner Input - Hidden but always focused */}
        <div className="mb-2">
          <input
            ref={barcodeInputRef}
            type="text"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={handleBarcodeKeyDown}
            placeholder="Scan barcode or type barcode and press Enter"
            className="sr-only"
            autoFocus
            autoComplete="off"
          />
          <div className="mb-2 text-xs text-gray-500">
            💡 Barcode scanner ready - scan items to add to cart
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="w-full sm:w-64">
            <Select
              label="Customer (Optional)"
              options={[
                { value: "", label: "Walk-in Customer" },
                ...(customersData?.customers.map((c) => ({
                  value: c.id.toString(),
                  label: c.name,
                })) || []),
              ]}
              value={customerId?.toString() || ""}
              onChange={(e) =>
                dispatch(
                  setCustomer(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                )
              }
            />
          </div>
          <div className="w-full sm:w-32">
            <Input
              label="Discount"
              type="number"
              value={discount}
              onChange={(e) =>
                dispatch(setDiscount(parseFloat(e.target.value) || 0))
              }
            />
          </div>
          <div className="w-full sm:w-32">
            <Input
              label="Tax"
              type="number"
              step="0.1"
              value={tax}
              onChange={(e) =>
                dispatch(setTax(parseFloat(e.target.value) || 0))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2">
            <ProductGrid />
          </div>
          <div className="lg:sticky lg:top-6 lg:col-span-1 lg:self-start">
            <Cart onCheckout={() => setIsPaymentModalOpen(true)} />
          </div>
        </div>

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {}}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

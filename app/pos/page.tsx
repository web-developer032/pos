"use client";

import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { HeldCarts } from "@/components/pos/HeldCarts";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import {
  setCustomer,
  setDiscount,
  setTax,
  holdCart,
} from "@/lib/slices/cartSlice";
import { Modal } from "@/components/ui/Modal";
import { useGetCustomersQuery } from "@/lib/api/customersApi";
import { useBarcodeScanner } from "@/lib/hooks/useBarcodeScanner";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { roundPrice } from "@/lib/utils/formHelpers";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export default function POSPage() {
  const dispatch = useAppDispatch();
  const { items, customerId, discount, tax } = useAppSelector(
    (state) => state.cart
  );
  const { data: customersData } = useGetCustomersQuery();
  const { format: formatCurrency } = useCurrency();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHoldCartModalOpen, setIsHoldCartModalOpen] = useState(false);
  const [holdCartName, setHoldCartName] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Calculate totals
  const subtotal = roundPrice(
    items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0)
  );
  const finalTotal = roundPrice(subtotal - discount + tax);

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
    if (!isPaymentModalOpen && !isHoldCartModalOpen) {
      requestAnimationFrame(() => {
        barcodeInputRef.current?.focus();
      });
    }
  }, [isPaymentModalOpen, isHoldCartModalOpen]);

  const handleHoldCart = () => {
    if (items.length === 0) return;
    setIsHoldCartModalOpen(true);
  };

  const handleConfirmHoldCart = () => {
    const trimmedName = holdCartName.trim();
    dispatch(holdCart(trimmedName ? { name: trimmedName } : undefined));
    setHoldCartName("");
    setIsHoldCartModalOpen(false);
    toast.success("Cart held successfully");
  };

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

        <div className="mb-4 flex gap-4">
          <div>
            <Select
              direction="column"
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
          <div>
            <Input
              label="Discount"
              type="number"
              step="0.01"
              value={discount}
              onChange={(e) =>
                dispatch(
                  setDiscount(roundPrice(parseFloat(e.target.value) || 0))
                )
              }
            />
          </div>
          <div>
            <Input
              label="Tax"
              type="number"
              step="0.01"
              value={tax}
              onChange={(e) =>
                dispatch(setTax(roundPrice(parseFloat(e.target.value) || 0)))
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2">
            <HeldCarts />
            <ProductGrid />
          </div>
          <div className="lg:sticky lg:top-6 lg:col-span-1 lg:self-start">
            <Cart
              onCheckout={() => setIsPaymentModalOpen(true)}
              onHoldCart={handleHoldCart}
            />
          </div>
        </div>

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={() => {}}
        />

        {/* Hold Cart Modal */}
        <Modal
          isOpen={isHoldCartModalOpen}
          onClose={() => {
            setIsHoldCartModalOpen(false);
            setHoldCartName("");
          }}
          title="Hold Cart"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This cart will be saved and you can resume it later. You can
              optionally give it a name to identify it easily.
            </p>
            <Input
              label="Cart Name (Optional)"
              value={holdCartName}
              onChange={(e) => setHoldCartName(e.target.value)}
              placeholder="e.g., Customer Name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleConfirmHoldCart();
                }
              }}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsHoldCartModalOpen(false);
                  setHoldCartName("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmHoldCart}>Hold Cart</Button>
            </div>
          </div>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

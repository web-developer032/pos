"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
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
  addItem,
} from "@/lib/slices/cartSlice";
import { Modal } from "@/components/ui/Modal";
import { useGetCustomersQuery } from "@/lib/api/customersApi";
import { useGetProductByBarcodeQuery } from "@/lib/api/productsApi";
import { useGetCurrentSessionQuery } from "@/lib/api/cashRegisterApi";
import { OpenDayModal } from "@/components/cash-register/OpenDayModal";
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
  const { data: sessionData } = useGetCurrentSessionQuery();
  const { format: formatCurrency } = useCurrency();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHoldCartModalOpen, setIsHoldCartModalOpen] = useState(false);
  const [isOpenDayModalOpen, setIsOpenDayModalOpen] = useState(false);
  const [holdCartName, setHoldCartName] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeToScan, setBarcodeToScan] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const processedBarcodesRef = useRef<Set<string>>(new Set());

  const isDayOpen = sessionData?.isOpen || false;

  // Calculate totals
  const subtotal = roundPrice(
    items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0)
  );
  const finalTotal = roundPrice(subtotal - discount + tax);

  // Barcode lookup query
  const {
    data: barcodeProductData,
    error: barcodeError,
    isFetching: isBarcodeFetching,
  } = useGetProductByBarcodeQuery(barcodeToScan, {
    skip: !barcodeToScan,
  });

  // Handle barcode product lookup result
  useEffect(() => {
    if (!barcodeToScan) return;

    // Skip if already processed
    if (processedBarcodesRef.current.has(barcodeToScan)) {
      return;
    }

    // Wait for query to complete - don't act on stale data
    if (isBarcodeFetching) {
      return;
    }

    // Check if we have an error (product not found)
    if (barcodeError) {
      processedBarcodesRef.current.add(barcodeToScan);
      toast.error("Product not found");
      setBarcodeToScan("");
      setBarcodeInput("");

      requestAnimationFrame(() => {
        barcodeInputRef.current?.focus();
      });

      setTimeout(() => {
        processedBarcodesRef.current.delete(barcodeToScan);
      }, 300);
      return;
    }

    // Product found - verify the barcode matches to avoid stale data issues
    if (barcodeProductData?.product) {
      const product = barcodeProductData.product;

      // Verify this product matches the scanned barcode
      const barcodeMatches =
        product.barcode === barcodeToScan ||
        product.additional_barcodes?.includes(barcodeToScan);

      if (!barcodeMatches) {
        // Stale data - wait for correct response
        return;
      }

      processedBarcodesRef.current.add(barcodeToScan);

      // Add to cart
      dispatch(
        addItem({
          product_id: product.id,
          name: product.name,
          price: roundPrice(product.selling_price),
          quantity: 1,
          stock_quantity: product.stock_quantity,
        })
      );
      toast.success(`${product.name} added to cart`);

      // Clear state
      setBarcodeToScan("");
      setBarcodeInput("");

      // Refocus for next scan
      requestAnimationFrame(() => {
        barcodeInputRef.current?.focus();
      });

      // Clean up processed after delay
      setTimeout(() => {
        processedBarcodesRef.current.delete(barcodeToScan);
      }, 300);
    }
  }, [
    barcodeToScan,
    barcodeProductData,
    barcodeError,
    isBarcodeFetching,
    dispatch,
  ]);

  // Handle barcode input (scanners send Enter after barcode)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      e.preventDefault();
      const barcode = barcodeInput.trim();
      if (!processedBarcodesRef.current.has(barcode)) {
        setBarcodeToScan(barcode);
      }
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
        {/* Day Not Open Warning */}
        {!isDayOpen && (
          <div className="mb-4 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-amber-800">
                    Day is not open
                  </p>
                  <p className="text-sm text-amber-700">
                    Open the day to start recording sales and track your cash
                    drawer.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsOpenDayModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Open Day
                </Button>
                <Link href="/cash-register">
                  <Button variant="outline">Go to Cash Register</Button>
                </Link>
              </div>
            </div>
          </div>
        )}

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

        {/* Open Day Modal */}
        <OpenDayModal
          isOpen={isOpenDayModalOpen}
          onClose={() => setIsOpenDayModalOpen(false)}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

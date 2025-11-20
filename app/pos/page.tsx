"use client";

import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import {
  setCustomer,
  setDiscount,
  setTax,
  addItem,
} from "@/lib/slices/cartSlice";
import { useGetCustomersQuery } from "@/lib/api/customersApi";
import { useGetProductByBarcodeQuery } from "@/lib/api/productsApi";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

export default function POSPage() {
  const dispatch = useAppDispatch();
  const { customerId, discount, tax } = useAppSelector((state) => state.cart);
  const { data: customersData } = useGetCustomersQuery();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeToScan, setBarcodeToScan] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Query product by barcode when barcode is scanned
  const { data: barcodeProductData, error: barcodeError } =
    useGetProductByBarcodeQuery(barcodeToScan || "", {
      skip: !barcodeToScan,
    });

  // Handle barcode scan result
  useEffect(() => {
    if (barcodeProductData?.product) {
      const product = barcodeProductData.product;
      dispatch(
        addItem({
          product_id: product.id,
          name: product.name,
          price: product.selling_price,
          quantity: 1,
          stock_quantity: product.stock_quantity,
        })
      );
      toast.success(`${product.name} added to cart`);
      setBarcodeInput("");
      setBarcodeToScan(null);
      // Refocus barcode input for next scan
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    } else if (barcodeError && barcodeToScan) {
      toast.error("Product not found");
      setBarcodeInput("");
      setBarcodeToScan(null);
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [barcodeProductData, barcodeError, barcodeToScan, dispatch]);

  // Handle barcode input (most scanners send Enter after barcode)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      e.preventDefault();
      setBarcodeToScan(barcodeInput.trim());
    }
  };

  // Auto-focus barcode input on mount and when modal closes
  useEffect(() => {
    if (!isPaymentModalOpen) {
      setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
    }
  }, [isPaymentModalOpen]);

  return (
    <ProtectedRoute allowedRoles={["admin", "cashier", "manager"]}>
      <DashboardLayout>
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">Point of Sale</h1>
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

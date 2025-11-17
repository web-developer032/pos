"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { Button } from "@/components/ui/Button";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { setCustomer, setDiscount, setTax } from "@/lib/slices/cartSlice";
import { useGetCustomersQuery } from "@/lib/api/customersApi";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

export default function POSPage() {
  const dispatch = useAppDispatch();
  const { customerId, discount, tax } = useAppSelector((state) => state.cart);
  const { data: customersData } = useGetCustomersQuery();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={["admin", "cashier", "manager"]}>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Point of Sale</h1>
        </div>

        <div className="mb-4 flex gap-4">
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
            className="w-64"
          />
          <Input
            label="Discount"
            type="number"
            step="0.01"
            value={discount}
            onChange={(e) =>
              dispatch(setDiscount(parseFloat(e.target.value) || 0))
            }
            className="w-32"
          />
          <Input
            label="Tax"
            type="number"
            step="0.01"
            value={tax}
            onChange={(e) => dispatch(setTax(parseFloat(e.target.value) || 0))}
            className="w-32"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProductGrid />
          </div>
          <div className="lg:col-span-1">
            <Cart />
            <Button
              className="mt-4 w-full"
              onClick={() => setIsPaymentModalOpen(true)}
            >
              Checkout
            </Button>
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

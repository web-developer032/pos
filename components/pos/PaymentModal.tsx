"use client";

import { useState } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useCreateSaleMutation } from "@/lib/api/salesApi";
import { clearCart } from "@/lib/slices/cartSlice";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import toast from "react-hot-toast";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const dispatch = useAppDispatch();
  const { items, customerId, discount, tax } = useAppSelector(
    (state) => state.cart
  );
  const [createSale, { isLoading }] = useCreateSaleMutation();
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "digital"
  >("cash");
  const { format: formatCurrency } = useCurrency();

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const finalTotal = subtotal - discount + tax;

  const handlePayment = async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      await createSale({
        customer_id: customerId,
        items: items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        discount_amount: discount,
        tax_amount: tax,
        payment_method: paymentMethod,
      }).unwrap();

      dispatch(clearCart());
      toast.success("Sale completed successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to complete sale");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Payment" size="md">
      <div className="space-y-4">
        <div className="rounded border p-4">
          <div className="mb-2 flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="mb-2 flex justify-between">
            <span>Discount:</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
          <div className="mb-2 flex justify-between">
            <span>Tax:</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span>Total:</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
        </div>

        <Select
          label="Payment Method"
          options={[
            { value: "cash", label: "Cash" },
            { value: "card", label: "Card" },
            { value: "digital", label: "Digital" },
          ]}
          value={paymentMethod}
          onChange={(e) =>
            setPaymentMethod(e.target.value as "cash" | "card" | "digital")
          }
        />

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={isLoading}>
            {isLoading ? "Processing..." : "Complete Payment"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

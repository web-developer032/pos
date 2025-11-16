"use client";

import { useState } from "react";
import { useAdjustInventoryMutation } from "@/lib/api/inventoryApi";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface StockAdjustmentFormProps {
  productId: number;
  onSuccess?: () => void;
}

export function StockAdjustmentForm({
  productId,
  onSuccess,
}: StockAdjustmentFormProps) {
  const [adjustInventory] = useAdjustInventoryMutation();
  const [quantity, setQuantity] = useState("");
  const [transactionType, setTransactionType] = useState<
    "sale" | "purchase" | "adjustment"
  >("adjustment");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adjustInventory({
        product_id: productId,
        quantity: parseInt(quantity),
        transaction_type: transactionType,
        notes: notes || undefined,
      }).unwrap();
      toast.success("Stock adjusted successfully");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to adjust stock");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Transaction Type"
        options={[
          { value: "purchase", label: "Purchase (Add Stock)" },
          { value: "sale", label: "Sale (Remove Stock)" },
          { value: "adjustment", label: "Adjustment (Set Stock)" },
        ]}
        value={transactionType}
        onChange={(e) =>
          setTransactionType(
            e.target.value as "sale" | "purchase" | "adjustment"
          )
        }
      />
      <Input
        label="Quantity"
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        required
      />
      <Input
        label="Notes (Optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex justify-end space-x-2">
        <Button type="submit">Adjust Stock</Button>
      </div>
    </form>
  );
}


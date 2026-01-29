"use client";

import { useState, useEffect } from "react";
import { useAdjustInventoryMutation } from "@/lib/api/inventoryApi";
import { useGetProductQuery } from "@/lib/api/productsApi";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import toast from "react-hot-toast";

interface StockAdjustmentFormProps {
  productId: number;
  initialQuantity?: number;
  onSuccess?: () => void;
}

export function StockAdjustmentForm({
  productId,
  initialQuantity,
  onSuccess,
}: StockAdjustmentFormProps) {
  const { data: productData, isLoading: isLoadingProduct } =
    useGetProductQuery(productId);
  const [adjustInventory, { isLoading: isAdjusting }] =
    useAdjustInventoryMutation();
  const [quantity, setQuantity] = useState(
    initialQuantity != null ? String(initialQuantity) : ""
  );
  const [transactionType, setTransactionType] = useState<
    "sale" | "purchase" | "adjustment"
  >("adjustment");

  useEffect(() => {
    setQuantity(initialQuantity != null ? String(initialQuantity) : "");
  }, [productId, initialQuantity]);
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdjusting) return; // Prevent double submission

    // Check if product is a related product (has base_product_id)
    if (productData?.product && productData.product.base_product_id) {
      toast.error(
        `Cannot adjust related product directly. Please adjust the base product (ID: ${productData.product.base_product_id}) instead.`,
        { duration: 5000 }
      );
      return;
    }

    try {
      await adjustInventory({
        product_id: productId,
        quantity: parseInt(quantity),
        transaction_type: transactionType,
        notes: notes || undefined,
      }).unwrap();
      toast.success("Stock adjusted successfully");
      onSuccess?.();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to adjust stock";
      toast.error(errorMessage);
    }
  };

  if (isLoadingProduct) {
    return (
      <div className="py-4 text-center">Loading product information...</div>
    );
  }

  return (
    <Form onSubmit={handleSubmit} className="space-y-4">
      {productData?.product && (
        <div className="mb-4 rounded-lg bg-gray-50">
          <p className="text-sm text-gray-600">
            Product:{" "}
            <span className="text-lg font-semibold text-gray-900">
              {productData.product.name}
            </span>
          </p>

          {productData.product.sku && (
            <p className="text-sm text-gray-500">
              SKU:{" "}
              <span className="text-lg font-semibold text-gray-900">
                {productData.product.sku}
              </span>
            </p>
          )}
        </div>
      )}
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
        <Button type="submit" disabled={isAdjusting}>
          {isAdjusting ? "Adjusting..." : "Adjust Stock"}
        </Button>
      </div>
    </Form>
  );
}

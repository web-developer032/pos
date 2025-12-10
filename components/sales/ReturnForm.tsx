"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateReturnMutation,
  useGetSaleReturnsQuery,
  CreateReturnRequest,
} from "@/lib/api/returnsApi";
import { SaleItem } from "@/lib/api/salesApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Form } from "@/components/ui/Form";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useScrollToError } from "@/lib/hooks/useScrollToError";
import toast from "react-hot-toast";

interface ReturnFormProps {
  saleId: number;
  saleItems: SaleItem[];
  onSuccess: () => void;
}

export function ReturnForm({ saleId, saleItems, onSuccess }: ReturnFormProps) {
  const { data: returnsData } = useGetSaleReturnsQuery(saleId);
  const [createReturn, { isLoading }] = useCreateReturnMutation();
  const { format: formatCurrency } = useCurrency();

  // Calculate available quantities for each item
  const getAvailableQuantity = (saleItemId: number) => {
    const saleItem = saleItems.find((item) => item.id === saleItemId);
    if (!saleItem) return 0;

    const itemStatus = returnsData?.sale_items_status?.find(
      (status) => status.id === saleItemId
    );
    const returnedQty = itemStatus?.returned_quantity || 0;
    return saleItem.quantity - returnedQty;
  };

  const [selectedItems, setSelectedItems] = useState<
    Record<
      number,
      {
        sale_item_id: number;
        product_id: number;
        quantity: number;
        unit_price: number;
        available: number;
      }
    >
  >({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{
    refund_method: "cash" | "card" | "digital" | "store_credit";
    reason: string;
    notes: string;
  }>({
    defaultValues: {
      refund_method: "cash",
      reason: "",
      notes: "",
    },
  });

  // Auto-scroll to first error on validation failure
  useScrollToError(errors);

  const handleItemToggle = (item: SaleItem) => {
    const available = getAvailableQuantity(item.id);
    if (available <= 0) {
      toast.error("This item has already been fully returned");
      return;
    }

    if (selectedItems[item.id]) {
      const newSelected = { ...selectedItems };
      delete newSelected[item.id];
      setSelectedItems(newSelected);
    } else {
      setSelectedItems({
        ...selectedItems,
        [item.id]: {
          sale_item_id: item.id,
          product_id: item.product_id,
          quantity: available,
          unit_price: item.unit_price,
          available,
        },
      });
    }
  };

  const handleQuantityChange = (
    saleItemId: number,
    quantity: number,
    available: number
  ) => {
    if (quantity > available) {
      toast.error(`Cannot return more than ${available} units`);
      return;
    }
    if (quantity < 0.01) {
      toast.error("Quantity must be at least 0.01");
      return;
    }

    setSelectedItems((prev) => ({
      ...prev,
      [saleItemId]: {
        ...prev[saleItemId],
        quantity: Math.min(quantity, available),
      },
    }));
  };

  const calculateTotalRefund = () => {
    return Object.values(selectedItems).reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
  };

  const onSubmit = async (data: {
    refund_method: "cash" | "card" | "digital" | "store_credit";
    reason: string;
    notes: string;
  }) => {
    const items = Object.values(selectedItems);
    if (items.length === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    try {
      const returnRequest: CreateReturnRequest = {
        sale_id: saleId,
        items: items.map((item) => ({
          sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        refund_method: data.refund_method,
        reason: data.reason || undefined,
        notes: data.notes || undefined,
      };

      await createReturn(returnRequest).unwrap();
      toast.success("Return processed successfully");
      setSelectedItems({});
      reset();
      onSuccess();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to process return";
      toast.error(errorMessage);
    }
  };

  return (
    <Form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      preventEnterSubmit={true}
    >
      <div className="max-h-[400px] space-y-2 overflow-y-auto">
        {saleItems.map((item) => {
          const available = getAvailableQuantity(item.id);
          const isSelected = !!selectedItems[item.id];
          const selectedQty = selectedItems[item.id]?.quantity || 0;

          if (available <= 0) {
            return (
              <div
                key={item.id}
                className="rounded border border-gray-200 bg-gray-50 p-3 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-xs text-gray-500">
                      {item.quantity} sold • {available} available to return
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">Fully Returned</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className={`rounded border p-3 ${
                isSelected
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleItemToggle(item)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} sold • {available} available to return
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-gray-600">
                        Return Qty:
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={available}
                        value={selectedQty}
                        onChange={(e) =>
                          handleQuantityChange(
                            item.id,
                            parseFloat(e.target.value) || 0,
                            available
                          )
                        }
                        className="w-24"
                      />
                      <span className="text-xs text-gray-500">
                        × {formatCurrency(item.unit_price)} ={" "}
                        {formatCurrency(selectedQty * item.unit_price)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {Object.keys(selectedItems).length > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex justify-between">
            <span className="font-semibold text-indigo-900">
              Total Refund Amount:
            </span>
            <span className="text-lg font-bold text-indigo-600">
              {formatCurrency(calculateTotalRefund())}
            </span>
          </div>
        </div>
      )}

      <Select
        label="Refund Method *"
        options={[
          { value: "cash", label: "Cash" },
          { value: "card", label: "Card" },
          { value: "digital", label: "Digital" },
          { value: "store_credit", label: "Store Credit" },
        ]}
        {...register("refund_method", {
          required: "Refund method is required",
        })}
        error={errors.refund_method?.message}
      />

      <Input
        label="Reason (Optional)"
        {...register("reason")}
        placeholder="e.g., Defective, Wrong item, Customer request"
      />

      <Input
        label="Notes (Optional)"
        {...register("notes")}
        placeholder="Additional notes about the return"
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="submit"
          disabled={isLoading || Object.keys(selectedItems).length === 0}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? "Processing..." : "Process Return"}
        </Button>
      </div>
    </Form>
  );
}

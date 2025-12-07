"use client";

import { memo } from "react";
import { Controller, Control, UseFormRegister, FieldErrors } from "react-hook-form";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useCurrency } from "@/lib/hooks/useCurrency";

interface OrderFormData {
  supplier_id: number;
  items: { product_id: number; quantity: number; unit_cost: number }[];
  discount_type?: "percentage" | "amount";
  discount_value?: number;
}

interface OrderSummaryProps {
  subtotal: number;
  discountType?: "percentage" | "amount";
  discountValue?: number;
  discountAmount: number;
  total: number;
  control: Control<OrderFormData>;
  register: UseFormRegister<OrderFormData>;
  errors: FieldErrors<OrderFormData>;
  onDiscountTypeChange: (value: string) => void;
}

export const OrderSummary = memo(function OrderSummary({
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  total,
  control,
  register,
  errors,
  onDiscountTypeChange,
}: OrderSummaryProps) {
  const { format: formatCurrency } = useCurrency();

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      {/* Discount Section */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          name="discount_type"
          control={control}
          render={({ field }) => (
            <Select
              label="Discount"
              options={[
                { value: "", label: "No Discount" },
                { value: "percentage", label: "Percentage (%)" },
                { value: "amount", label: "Fixed Amount" },
              ]}
              value={field.value || ""}
              onChange={(e) => {
                field.onChange(e.target.value === "" ? undefined : e.target.value);
                onDiscountTypeChange(e.target.value);
              }}
              error={errors.discount_type?.message}
            />
          )}
        />
        {discountType && (
          <Input
            label={discountType === "percentage" ? "Discount %" : "Discount Amount"}
            type="number"
            step="0.01"
            min="0"
            max={discountType === "percentage" ? "100" : undefined}
            {...register("discount_value", {
              valueAsNumber: true,
              validate: (val) => {
                if (discountType && (!val || val <= 0)) {
                  return "Required";
                }
                if (discountType === "percentage" && val !== undefined && val > 100) {
                  return "Max 100%";
                }
                return true;
              },
            })}
            error={errors.discount_value?.message}
          />
        )}
      </div>

      {/* Totals */}
      <div className="space-y-2 border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
        </div>

        {discountType && discountValue && discountValue > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-600">
              Discount{" "}
              <span className="text-gray-500">
                ({discountType === "percentage" ? `${discountValue}%` : formatCurrency(discountValue)})
              </span>
            </span>
            <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-300 pt-2">
          <span className="text-base font-semibold text-gray-900">Total</span>
          <span className="text-lg font-bold text-indigo-600">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
});


"use client";

import { memo, forwardRef } from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Input } from "@/components/ui/Input";
import { useCurrency } from "@/lib/hooks/useCurrency";

interface PurchaseOrderItemData {
  product_id: number;
  quantity: number;
  unit_cost: number;
  retail_price?: number;
}

interface ProductOption {
  value: number;
  label: string;
}

interface PurchaseOrderItemProps {
  index: number;
  itemNumber: number;
  canRemove: boolean;
  productId: number;
  quantity: number;
  unitCost: number;
  retailPrice: number;
  discountFactor: number;
  productOptions: ProductOption[];
  errors?: FieldErrors<PurchaseOrderItemData>;
  register: UseFormRegister<{
    items: PurchaseOrderItemData[];
    supplier_id: number;
    discount_type?: "percentage" | "amount";
    discount_value?: number;
  }>;
  onProductChange: (productId: number) => void;
  onProductSearch: (search: string) => void;
  onBarcodeKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onAddProduct: () => void;
}

export const PurchaseOrderItem = memo(
  forwardRef<HTMLInputElement, PurchaseOrderItemProps>(
    function PurchaseOrderItem(
      {
        index,
        itemNumber,
        canRemove,
        productId,
        quantity,
        unitCost,
        retailPrice,
        discountFactor,
        productOptions,
        errors,
        register,
        onProductChange,
        onProductSearch,
        onBarcodeKeyDown,
        onRemove,
        onAddProduct,
      },
      ref
    ) {
      const { format: formatCurrency } = useCurrency();
      const subtotal = (quantity || 0) * (unitCost || 0);
      const hasValues = productId > 0 && quantity > 0 && unitCost > 0;

      // Calculate adjusted cost after discount
      const adjustedCost = (unitCost || 0) * discountFactor;
      const hasDiscount = discountFactor < 1;

      // Calculate profit based on adjusted cost
      const profit = (retailPrice || 0) - adjustedCost;
      const profitMargin = adjustedCost > 0 ? (profit / adjustedCost) * 100 : 0;

      return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                {itemNumber}
              </span>
              <span className="text-sm font-medium text-gray-600">Item</span>
            </div>
            {canRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Fields - Row 1: Product and Quantity */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            {/* Product - takes more space */}
            <div className="sm:col-span-8">
              <SearchableSelect
                ref={ref}
                label="Product"
                options={[
                  { value: 0, label: "Select Product" },
                  ...productOptions,
                ]}
                value={productId}
                onChange={(val) => {
                  const id = Number(val);
                  if (id > 0) onProductChange(id);
                }}
                onSearch={onProductSearch}
                onKeyDown={onBarcodeKeyDown}
                placeholder="Search or scan barcode..."
                searchPlaceholder="Type name or scan barcode..."
                error={errors?.product_id?.message}
              />
              <button
                type="button"
                onClick={onAddProduct}
                className="mt-1 text-xs text-indigo-600 hover:text-indigo-800"
              >
                + New Product
              </button>
            </div>

            {/* Quantity */}
            <div className="sm:col-span-2">
              <Input
                label="Qty"
                type="number"
                min="1"
                {...register(`items.${index}.quantity`, {
                  valueAsNumber: true,
                })}
                error={errors?.quantity?.message}
              />
            </div>

            {/* Subtotal */}
            <div className="flex items-end sm:col-span-2">
              <div className="w-full rounded-md bg-gray-50 px-3 py-2">
                <span className="block text-xs text-gray-500">Subtotal</span>
                <span
                  className={`block text-sm font-semibold ${hasValues ? "text-gray-900" : "text-gray-400"}`}
                >
                  {hasValues ? formatCurrency(subtotal) : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Fields - Row 2: Cost, Adjusted Cost, Retail Price */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-12">
            {/* Unit Cost */}
            <div className="sm:col-span-2">
              <Input
                label="Cost Price"
                type="number"
                step="0.01"
                min="0"
                {...register(`items.${index}.unit_cost`, {
                  valueAsNumber: true,
                })}
                error={errors?.unit_cost?.message}
              />
            </div>

            {/* Adjusted Cost (after discount) */}
            <div className="flex items-end sm:col-span-2">
              <div
                className={`w-full rounded-md px-3 py-2 ${hasDiscount ? "border-2 border-green-300 bg-green-50" : "bg-gray-50"}`}
              >
                <span className="block text-xs text-gray-500">
                  {hasDiscount ? "After Discount" : "Final Cost"}
                </span>
                <span
                  className={`block text-sm font-semibold ${hasDiscount ? "text-green-700" : "text-gray-900"}`}
                >
                  {unitCost > 0 ? formatCurrency(adjustedCost) : "—"}
                </span>
                {hasDiscount && unitCost > 0 && (
                  <span className="block text-xs text-green-600">
                    -{((1 - discountFactor) * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Retail Price */}
            <div className="sm:col-span-2">
              <Input
                label="Retail Price"
                type="number"
                step="0.01"
                min="0"
                {...register(`items.${index}.retail_price`, {
                  valueAsNumber: true,
                })}
                error={errors?.retail_price?.message}
              />
            </div>

            {/* Profit Display */}
            <div className="flex items-end sm:col-span-6">
              {hasValues && retailPrice > 0 && (
                <div className="flex w-full gap-2">
                  <div className="flex-1 rounded-md bg-gray-50 px-3 py-2">
                    <span className="block text-xs text-gray-500">
                      Profit/Unit
                    </span>
                    <span
                      className={`block text-sm font-semibold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(profit)}
                    </span>
                  </div>
                  <div className="flex-1 rounded-md bg-gray-50 px-3 py-2">
                    <span className="block text-xs text-gray-500">Margin</span>
                    <span
                      className={`block text-sm font-semibold ${profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {profitMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  )
);

PurchaseOrderItem.displayName = "PurchaseOrderItem";

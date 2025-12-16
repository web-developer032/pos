"use client";

import { memo, forwardRef } from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Input } from "@/components/ui/Input";
import { useCurrency } from "@/lib/hooks/useCurrency";

interface PurchaseOrderItemData {
  product_id: number;
  product_name?: string;
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
  productName: string;
  quantity: number;
  unitCost: number;
  retailPrice: number;
  discountFactor: number;
  taxFactor: number;
  productOptions: ProductOption[];
  errors?: FieldErrors<PurchaseOrderItemData>;
  register: UseFormRegister<{
    items: PurchaseOrderItemData[];
    supplier_id: number;
    discount_type?: "percentage" | "amount";
    discount_value?: number;
    tax_type?: "percentage" | "amount";
    tax_value?: number;
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
        taxFactor,
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

      // Calculate adjusted cost after discount and tax
      const costAfterDiscount = (unitCost || 0) * discountFactor;
      const adjustedCost = costAfterDiscount * taxFactor;
      const hasDiscount = discountFactor < 1;
      const hasTax = taxFactor > 1;
      const hasAdjustment = hasDiscount || hasTax;

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

          {/* Row 1: Product Select | Product Name */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
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
            <div>
              <Input
                label="Updated Name"
                placeholder="Product name (editable)"
                {...register(`items.${index}.product_name`)}
                error={errors?.product_name?.message}
              />
            </div>
          </div>

          {/* Row 2: Qty | Cost | Retail */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Input
              label="Qty"
              type="number"
              step="0.001"
              min="0"
              {...register(`items.${index}.quantity`, {
                valueAsNumber: true,
              })}
              error={errors?.quantity?.message}
            />
            <Input
              label="Cost"
              type="number"
              step="0.001"
              min="0"
              {...register(`items.${index}.unit_cost`, {
                valueAsNumber: true,
              })}
              error={errors?.unit_cost?.message}
            />
            <Input
              label="Retail"
              type="number"
              step="0.001"
              min="0"
              {...register(`items.${index}.retail_price`, {
                valueAsNumber: true,
              })}
              error={errors?.retail_price?.message}
            />
          </div>

          {/* Row 3: Subtotal, Final Cost, Profit, Margin */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Subtotal */}
            <div className="flex flex-col items-center justify-center rounded-md bg-gray-50 px-3 py-2">
              <span className="block text-xs text-gray-500">Subtotal</span>
              <span
                className={`block text-sm font-semibold ${hasValues ? "text-gray-900" : "text-gray-400"}`}
              >
                {hasValues ? formatCurrency(subtotal) : "—"}
              </span>
            </div>

            {/* Final Cost (after discount and tax) */}
            {hasAdjustment && unitCost > 0 ? (
              <div className="rounded-md border border-gray-200 bg-gradient-to-br from-gray-50 to-white px-3 py-2 shadow-sm">
                <div className="flex flex-col items-center justify-between">
                  <span className="text-xs text-gray-500">Final Cost/Unit</span>{" "}
                  <span className="text-sm font-bold text-indigo-700">
                    {formatCurrency(adjustedCost)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                  {hasDiscount && (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">
                      -{((1 - discountFactor) * 100).toFixed(0)}% disc
                    </span>
                  )}
                  {hasTax && (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-600">
                      +{((taxFactor - 1) * 100).toFixed(0)}% tax
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-gray-50 px-3 py-2">
                <span className="block text-xs text-gray-500">Final Cost</span>
                <span
                  className={`block text-sm font-semibold ${hasValues ? "text-gray-900" : "text-gray-400"}`}
                >
                  {hasValues ? formatCurrency(unitCost) : "—"}
                </span>
              </div>
            )}

            {/* Profit Display */}
            <div className="flex flex-col items-center justify-center rounded-md bg-gray-50 px-3 py-2">
              <span className="block text-xs text-gray-500">Profit/Unit</span>
              <span
                className={`block text-sm font-semibold ${
                  hasValues && retailPrice > 0
                    ? profit >= 0
                      ? "text-green-600"
                      : "text-red-600"
                    : "text-gray-400"
                }`}
              >
                {hasValues && retailPrice > 0 ? formatCurrency(profit) : "—"}
              </span>
            </div>

            {/* Margin Display */}
            <div className="flex flex-col items-center justify-center rounded-md bg-gray-50 px-3 py-2">
              <span className="block text-xs text-gray-500">Margin</span>
              <span
                className={`block text-sm font-semibold ${
                  hasValues && retailPrice > 0
                    ? profitMargin >= 0
                      ? "text-green-600"
                      : "text-red-600"
                    : "text-gray-400"
                }`}
              >
                {hasValues && retailPrice > 0
                  ? `${profitMargin.toFixed(1)}%`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      );
    }
  )
);

PurchaseOrderItem.displayName = "PurchaseOrderItem";

"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UNIT_OPTIONS, ProductUnit } from "@/lib/constants/productUnits";

function ProfitDisplay({
  costPrice,
  sellingPrice,
}: {
  costPrice: string;
  sellingPrice: string;
}) {
  const cost = parseFloat(costPrice) || 0;
  const selling = parseFloat(sellingPrice) || 0;
  const profit = selling - cost;
  const margin = selling > 0 ? (profit / selling) * 100 : 0;

  const isValid = cost > 0 && selling > 0;
  const isPositive = profit > 0;
  const isNegative = profit < 0;

  return (
    <div className="flex flex-col">
      <label className="mb-1 text-sm font-medium text-gray-700">Profit</label>
      <div
        className={`flex h-[38px] items-center justify-center rounded-md border px-2 text-sm font-medium ${
          !isValid
            ? "border-gray-200 bg-gray-50 text-gray-400"
            : isNegative
              ? "border-red-200 bg-red-50 text-red-600"
              : isPositive
                ? "border-green-200 bg-green-50 text-green-600"
                : "border-gray-200 bg-gray-50 text-gray-500"
        }`}
      >
        {isValid ? (
          <span>
            {isPositive ? "+" : ""}
            {profit.toFixed(2)} ({margin.toFixed(1)}%)
          </span>
        ) : (
          <span>—</span>
        )}
      </div>
    </div>
  );
}

export interface SubProductInput {
  id: string;
  name: string;
  barcode: string;
  quantity_multiplier: string;
  cost_price: string;
  selling_price: string;
  unit: ProductUnit;
}

interface SubProductCardProps {
  subProduct: SubProductInput;
  index: number;
  totalCount: number;
  baseCostPrice: number;
  baseSellingPrice: number;
  onUpdate: (id: string, field: keyof SubProductInput, value: string) => void;
  onRemove: (id: string) => void;
}

// Calculate price based on multiplier and base price
function calculatePrice(multiplier: string, basePrice: number): string {
  const mult = parseFloat(multiplier);
  if (isNaN(mult) || mult <= 0 || !basePrice || basePrice <= 0) {
    return "";
  }
  return (basePrice * mult).toFixed(2);
}

export function SubProductCard({
  subProduct,
  index,
  totalCount,
  baseCostPrice,
  baseSellingPrice,
  onUpdate,
  onRemove,
}: SubProductCardProps) {
  // Newest items are at the start of array, so reverse the numbering
  // to show newest with highest number
  const displayNumber = totalCount - index;

  return (
    <div className="rounded-md border border-green-300 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">
          Sub-Product #{displayNumber}
        </span>
        <button
          type="button"
          onClick={() => onRemove(subProduct.id)}
          className="text-red-500 hover:text-red-700"
          aria-label="Remove sub-product"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {/* Row 1: Name */}
        <Input
          label="Name *"
          value={subProduct.name}
          onChange={(e) => onUpdate(subProduct.id, "name", e.target.value)}
          placeholder="e.g., Sugar 700g"
        />

        {/* Row 2: Barcode, Qty Multiplier, Unit */}
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Barcode"
            value={subProduct.barcode}
            onChange={(e) => onUpdate(subProduct.id, "barcode", e.target.value)}
            placeholder="Scan or enter"
          />
          <Input
            label="Qty Multiplier *"
            type="number"
            step="0.01"
            value={subProduct.quantity_multiplier}
            onChange={(e) => {
              const newMultiplier = e.target.value;
              onUpdate(subProduct.id, "quantity_multiplier", newMultiplier);

              // Auto-calculate prices based on base prices
              const newCostPrice = calculatePrice(newMultiplier, baseCostPrice);
              const newSellingPrice = calculatePrice(
                newMultiplier,
                baseSellingPrice
              );

              if (newCostPrice) {
                onUpdate(subProduct.id, "cost_price", newCostPrice);
              }
              if (newSellingPrice) {
                onUpdate(subProduct.id, "selling_price", newSellingPrice);
              }
            }}
            placeholder="e.g., 0.7"
          />
          <Select
            label="Unit"
            direction="column"
            options={[...UNIT_OPTIONS]}
            value={subProduct.unit}
            onChange={(e) => onUpdate(subProduct.id, "unit", e.target.value)}
          />
        </div>

        {/* Row 3: Cost Price, Selling Price, Profit */}
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Cost Price *"
            type="number"
            step="0.01"
            value={subProduct.cost_price}
            onChange={(e) =>
              onUpdate(subProduct.id, "cost_price", e.target.value)
            }
            placeholder="e.g., 50"
          />
          <Input
            label="Selling Price *"
            type="number"
            step="0.01"
            value={subProduct.selling_price}
            onChange={(e) =>
              onUpdate(subProduct.id, "selling_price", e.target.value)
            }
            placeholder="e.g., 70"
          />
          <ProfitDisplay
            costPrice={subProduct.cost_price}
            sellingPrice={subProduct.selling_price}
          />
        </div>
      </div>
    </div>
  );
}

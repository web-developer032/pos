"use client";

import { Button } from "@/components/ui/Button";
import { SubProductCard, SubProductInput } from "./SubProductCard";
import { ProductUnit, DEFAULT_UNIT } from "@/lib/constants/productUnits";

interface SubProductsSectionProps {
  subProducts: SubProductInput[];
  parentUnit: ProductUnit;
  onAdd: () => void;
  onUpdate: (id: string, field: keyof SubProductInput, value: string) => void;
  onRemove: (id: string) => void;
}

export function SubProductsSection({
  subProducts,
  onAdd,
  onUpdate,
  onRemove,
}: SubProductsSectionProps) {
  return (
    <div className="my-4 rounded-lg border border-green-200 bg-green-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-800">
            Sub-Products (Optional)
          </h4>
          <p className="text-xs text-gray-600">
            Create related products that share stock with this base product
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onAdd}
          className="text-green-700 hover:text-green-800"
        >
          + Add Sub-Product
        </Button>
      </div>

      {subProducts.length > 0 && (
        <div className="space-y-3">
          {subProducts.map((subProduct, index) => (
            <SubProductCard
              key={subProduct.id}
              subProduct={subProduct}
              index={index}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
          <p className="text-xs text-gray-500">
            Sub-products will inherit SKU and category from the base product.
            Unit defaults to parent but can be changed.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper to create a new sub-product with default values
export function createSubProduct(parentUnit: ProductUnit = DEFAULT_UNIT): SubProductInput {
  return {
    id: `sub-${Date.now()}`,
    name: "",
    barcode: "",
    quantity_multiplier: "",
    cost_price: "",
    selling_price: "",
    unit: parentUnit,
  };
}

// Re-export types for convenience
export type { SubProductInput };


import { toFloat } from "@/lib/utils/formHelpers";

export interface SubProductForValidation {
  name: string;
  quantity_multiplier: string;
  cost_price: string;
  selling_price: string;
}

/**
 * Validates an array of sub-products before form submission
 * @throws Error if validation fails
 */
export function validateSubProducts(subProducts: SubProductForValidation[]): void {
  for (const sp of subProducts) {
    if (!sp.name.trim()) {
      throw new Error("All sub-products must have a name");
    }

    const multiplier = toFloat(sp.quantity_multiplier);
    if (!sp.quantity_multiplier || multiplier <= 0) {
      throw new Error(
        `Sub-product "${sp.name || "unnamed"}" must have a valid quantity multiplier`
      );
    }

    const costPrice = toFloat(sp.cost_price);
    if (!sp.cost_price || costPrice < 0) {
      throw new Error(`Sub-product "${sp.name}" must have a valid cost price`);
    }

    const sellingPrice = toFloat(sp.selling_price);
    if (!sp.selling_price || sellingPrice < 0) {
      throw new Error(`Sub-product "${sp.name}" must have a valid selling price`);
    }
  }
}


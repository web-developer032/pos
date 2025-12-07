// Product unit types and options used across the application

export type ProductUnit = "piece" | "gram" | "kilogram" | "liter" | "milliliter";

export const PRODUCT_UNITS: ProductUnit[] = [
  "piece",
  "gram",
  "kilogram",
  "liter",
  "milliliter",
];

export const UNIT_OPTIONS = [
  { value: "piece", label: "Piece" },
  { value: "gram", label: "Gram (g)" },
  { value: "kilogram", label: "Kilogram (kg)" },
  { value: "liter", label: "Liter (L)" },
  { value: "milliliter", label: "Milliliter (mL)" },
] as const;

export const DEFAULT_UNIT: ProductUnit = "piece";

// Get display label for a unit
export function getUnitLabel(unit: ProductUnit): string {
  return UNIT_OPTIONS.find((o) => o.value === unit)?.label || unit;
}


"use client";

import { useMemo } from "react";

interface OrderItem {
  product_id: number;
  quantity: number;
  unit_cost: number;
}

interface OrderCalculations {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  discountFactor: number;
  taxFactor: number;
}

export function useOrderCalculations(
  items: OrderItem[],
  discountType?: "percentage" | "amount",
  discountValue?: number,
  taxType?: "percentage" | "amount",
  taxValue?: number
): OrderCalculations {
  // Create a stable key from item values to properly trigger recalculations
  // when item contents change (react-hook-form may reuse array references)
  const itemsKey = items
    .map((item) => `${item.product_id}-${item.quantity}-${item.unit_cost}`)
    .join("|");

  return useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0),
      0
    );

    // Handle NaN values from cleared number inputs
    const safeDiscountValue = discountValue && !isNaN(discountValue) ? discountValue : 0;
    const safeTaxValue = taxValue && !isNaN(taxValue) ? taxValue : 0;

    let discountAmount = 0;
    let discountFactor = 1;

    if (discountType && safeDiscountValue > 0 && subtotal > 0) {
      if (discountType === "percentage") {
        discountAmount = (subtotal * safeDiscountValue) / 100;
        discountFactor = 1 - safeDiscountValue / 100;
      } else {
        discountAmount = safeDiscountValue;
        discountFactor = Math.max(0, (subtotal - safeDiscountValue) / subtotal);
      }
    }

    const afterDiscount = Math.max(0, subtotal - discountAmount);

    // Calculate tax (applied to subtotal after discount)
    let taxAmount = 0;
    let taxFactor = 1;
    if (taxType && safeTaxValue > 0 && afterDiscount > 0) {
      if (taxType === "percentage") {
        taxAmount = (afterDiscount * safeTaxValue) / 100;
        taxFactor = 1 + safeTaxValue / 100;
      } else {
        taxAmount = safeTaxValue;
        taxFactor =
          afterDiscount > 0 ? (afterDiscount + safeTaxValue) / afterDiscount : 1;
      }
    }

    const total = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
      discountFactor,
      taxFactor,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, discountType, discountValue, taxType, taxValue]);
}

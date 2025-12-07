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
  total: number;
}

export function useOrderCalculations(
  items: OrderItem[],
  discountType?: "percentage" | "amount",
  discountValue?: number
): OrderCalculations {
  return useMemo(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0),
      0
    );

    let discountAmount = 0;
    if (discountType && discountValue && discountValue > 0) {
      if (discountType === "percentage") {
        discountAmount = (subtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
    }

    const total = Math.max(0, subtotal - discountAmount);

    return { subtotal, discountAmount, total };
  }, [items, discountType, discountValue]);
}


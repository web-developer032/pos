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
  discountFactor: number;
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
    let discountFactor = 1;
    
    if (discountType && discountValue && discountValue > 0 && subtotal > 0) {
      if (discountType === "percentage") {
        discountAmount = (subtotal * discountValue) / 100;
        discountFactor = 1 - (discountValue / 100);
      } else {
        discountAmount = discountValue;
        discountFactor = Math.max(0, (subtotal - discountValue) / subtotal);
      }
    }

    const total = Math.max(0, subtotal - discountAmount);

    return { subtotal, discountAmount, total, discountFactor };
  }, [items, discountType, discountValue]);
}


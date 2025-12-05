"use client";

import { useMemo } from "react";
import { useGetProductsQuery } from "@/lib/api/productsApi";
import {
  calculateEffectiveStock,
  formatStockDisplay,
} from "@/lib/utils/productRelations";

export function TopProducts() {
  const { data, isLoading } = useGetProductsQuery();

  const topProducts = useMemo(() => {
    if (!data?.products) return [];
    // Create a copy of the array before sorting to avoid mutating the original
    return [...data.products]
      .map((product) => {
        const { effectiveStock, isComposite } = calculateEffectiveStock({
          stock_quantity: product.stock_quantity,
          min_stock_level: product.min_stock_level,
          base_product_id: product.base_product_id,
          quantity_multiplier: product.quantity_multiplier,
          base_product_stock: product.base_product_stock,
          unit: product.unit,
        });
        return {
          ...product,
          effectiveStock,
          isComposite,
        };
      })
      .sort((a, b) => b.effectiveStock - a.effectiveStock)
      .slice(0, 5);
  }, [data?.products]);

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Top Products</h3>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold">Top Products by Stock</h3>
      <div className="space-y-2">
        {topProducts.map((product) => {
          const stockDisplay = formatStockDisplay(
            product.effectiveStock,
            product.isComposite
          );
          return (
            <div key={product.id} className="flex items-center justify-between">
              <span className="text-sm">{product.name}</span>
              <span className="font-semibold">
                {stockDisplay} {product.unit || "pcs"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

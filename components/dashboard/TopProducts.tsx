"use client";

import { useMemo } from "react";
import { useGetProductsQuery } from "@/lib/api/productsApi";

export function TopProducts() {
  const { data, isLoading } = useGetProductsQuery();

  const topProducts = useMemo(() => {
    if (!data?.products) return [];
    // Create a copy of the array before sorting to avoid mutating the original
    return [...data.products]
      .sort((a, b) => b.stock_quantity - a.stock_quantity)
      .slice(0, 5);
  }, [data?.products]);

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold ">Top Products</h3>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold ">Top Products by Stock</h3>
      <div className="space-y-2">
        {topProducts.map((product) => (
          <div key={product.id} className="flex items-center justify-between">
            <span className="text-sm">{product.name}</span>
            <span className="font-semibold">
              {product.stock_quantity} units
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

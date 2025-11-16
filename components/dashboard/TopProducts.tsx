"use client";

import { useGetProductsQuery } from "@/lib/api/productsApi";

export function TopProducts() {
  const { data, isLoading } = useGetProductsQuery();

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Top Products</h3>
        <div>Loading...</div>
      </div>
    );
  }

  const topProducts = data?.products
    .sort((a, b) => b.stock_quantity - a.stock_quantity)
    .slice(0, 5) || [];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Top Products by Stock</h3>
      <div className="space-y-2">
        {topProducts.map((product) => (
          <div key={product.id} className="flex justify-between items-center">
            <span className="text-sm">{product.name}</span>
            <span className="font-semibold">{product.stock_quantity} units</span>
          </div>
        ))}
      </div>
    </div>
  );
}


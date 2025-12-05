"use client";

import { useGetProductsQuery } from "@/lib/api/productsApi";
import {
  calculateEffectiveStock,
  formatStockDisplay,
  isStockLow,
} from "@/lib/utils/productRelations";
import Link from "next/link";

export function LowStockAlerts() {
  const { data, isLoading } = useGetProductsQuery();

  if (isLoading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Low Stock Alerts</h3>
        <div>Loading...</div>
      </div>
    );
  }

  const lowStockProducts =
    data?.products
      .map((product) => {
        const { effectiveStock, effectiveMinStock, isComposite } =
          calculateEffectiveStock({
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
          effectiveMinStock,
          isComposite,
        };
      })
      .filter((p) => isStockLow(p.effectiveStock, p.effectiveMinStock)) || [];

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="mb-4 text-lg font-semibold">Low Stock Alerts</h3>
      {lowStockProducts.length === 0 ? (
        <p className="text-sm text-gray-500">No low stock items</p>
      ) : (
        <div className="space-y-2">
          {lowStockProducts.slice(0, 5).map((product) => {
            const stockDisplay = formatStockDisplay(
              product.effectiveStock,
              product.isComposite
            );
            const minStockDisplay = formatStockDisplay(
              product.effectiveMinStock,
              product.isComposite
            );
            return (
              <div
                key={product.id}
                className="flex items-center justify-between border-b pb-2"
              >
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    Stock: {stockDisplay} {product.unit || "pcs"} / Min:{" "}
                    {minStockDisplay} {product.unit || "pcs"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-600">Low</span>
              </div>
            );
          })}
          {lowStockProducts.length > 5 && (
            <Link
              href="/inventory"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              View all ({lowStockProducts.length})
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

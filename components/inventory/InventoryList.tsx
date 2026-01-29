"use client";

import { useState } from "react";
import { useGetInventoryQuery } from "@/lib/api/inventoryApi";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { StockAdjustmentForm } from "./StockAdjustmentForm";
import {
  calculateEffectiveStock,
  formatStockDisplay,
  isStockLow,
} from "@/lib/utils/productRelations";

export function InventoryList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const { data, isLoading, refetch } = useGetInventoryQuery({ page, limit });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: number;
    stock_quantity: number;
  } | null>(null);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
          <span className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-700">
              {data?.inventory.length || 0}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {data?.pagination?.total || 0}
            </span>{" "}
            items
          </span>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Product
              </th>
              <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                Category
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Current Stock
              </th>
              <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                Min Stock Level
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.inventory.map((item, index) => {
              const { effectiveStock, effectiveMinStock, isComposite } =
                calculateEffectiveStock({
                  stock_quantity: item.stock_quantity,
                  min_stock_level: item.min_stock_level,
                  base_product_id: item.base_product_id,
                  quantity_multiplier: item.quantity_multiplier,
                  base_product_stock: item.base_product_stock,
                  unit: item.unit,
                });
              const stockDisplay = formatStockDisplay(
                effectiveStock,
                isComposite
              );
              const minStockDisplay = formatStockDisplay(
                effectiveMinStock,
                isComposite
              );

              return (
                <tr
                  key={item.id}
                  className={
                    isStockLow(effectiveStock, effectiveMinStock)
                      ? "bg-red-50"
                      : ""
                  }
                >
                  <td className="whitespace-nowrap px-3 py-4 text-center text-sm text-gray-500 sm:px-4">
                    {(page - 1) * limit + index + 1}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium sm:px-6">
                    {item.name}
                  </td>
                  <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                    {item.category_name || "-"}
                  </td>
                  <td className="px-3 py-4 text-sm sm:px-6">
                    <span
                      className={
                        isStockLow(effectiveStock, effectiveMinStock)
                          ? "font-semibold text-red-600"
                          : ""
                      }
                    >
                      {stockDisplay} {item.unit || "pcs"}
                      {item.base_product_id && (
                        <span className="ml-1 text-xs text-gray-400">
                          (from base)
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                    {minStockDisplay} {item.unit || "pcs"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium sm:px-6">
                    {item.base_product_id ? (
                      <span className="text-xs italic text-gray-400">
                        Adjust base product
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedProduct({
                            id: item.id,
                            stock_quantity: item.stock_quantity,
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Adjust
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data?.pagination && (
        <div className="mt-4">
          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            totalItems={data.pagination.total}
            itemsPerPage={data.pagination.limit}
            onPageChange={(newPage) => {
              setPage(newPage);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onItemsPerPageChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        title="Adjust Stock"
      >
        {selectedProduct && (
          <StockAdjustmentForm
            productId={selectedProduct.id}
            initialQuantity={selectedProduct.stock_quantity}
            onSuccess={() => {
              setIsModalOpen(false);
              setSelectedProduct(null);
              refetch();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

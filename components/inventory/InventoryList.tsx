"use client";

import { useState } from "react";
import { useGetInventoryQuery } from "@/lib/api/inventoryApi";
import { Modal } from "@/components/ui/Modal";
import { StockAdjustmentForm } from "./StockAdjustmentForm";

export function InventoryList() {
  const { data, isLoading, refetch } = useGetInventoryQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Current Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Min Stock Level
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.inventory.map((item) => (
              <tr
                key={item.id}
                className={
                  item.stock_quantity <= item.min_stock_level ? "bg-red-50" : ""
                }
              >
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium ">
                  {item.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.category_name || "-"}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={
                      item.stock_quantity <= item.min_stock_level
                        ? "font-semibold text-red-600"
                        : ""
                    }
                  >
                    {item.stock_quantity}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.min_stock_level}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedProduct(item.id);
                      setIsModalOpen(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Adjust
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(null);
        }}
        title="Adjust Stock"
      >
        <StockAdjustmentForm
          productId={selectedProduct!}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}

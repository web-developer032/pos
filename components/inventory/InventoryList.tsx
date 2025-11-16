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
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Min Stock Level
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.inventory.map((item) => (
              <tr
                key={item.id}
                className={
                  item.stock_quantity <= item.min_stock_level
                    ? "bg-red-50"
                    : ""
                }
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.category_name || "-"}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={
                      item.stock_quantity <= item.min_stock_level
                        ? "text-red-600 font-semibold"
                        : "text-gray-900"
                    }
                  >
                    {item.stock_quantity}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.min_stock_level}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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


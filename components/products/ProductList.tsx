"use client";

import { useState } from "react";
import {
  useGetProductsQuery,
  useDeleteProductMutation,
} from "@/lib/api/productsApi";
import { useGetCategoriesQuery } from "@/lib/api/categoriesApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "./ProductForm";
import toast from "react-hot-toast";

export function ProductList() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const { data, isLoading, refetch } = useGetProductsQuery({
    search: search || undefined,
    categoryId,
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const [deleteProduct] = useDeleteProductMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const { format: formatCurrency } = useCurrency();

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id).unwrap();
        toast.success("Product deleted successfully");
        refetch();
      } catch (error: any) {
        toast.error(error.data?.error || "Failed to delete product");
      }
    }
  };

  const handleEdit = (id: number) => {
    setEditingProduct(id);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">All Products</h2>
        <Button onClick={() => setIsModalOpen(true)}>Add Product</Button>
      </div>

      <div className="mb-4 flex gap-4">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          options={[
            { value: "", label: "All Categories" },
            ...(categoriesData?.categories.map((c) => ({
              value: c.id.toString(),
              label: c.name,
            })) || []),
          ]}
          value={categoryId?.toString() || ""}
          onChange={(e) =>
            setCategoryId(e.target.value ? parseInt(e.target.value) : undefined)
          }
          className="w-48"
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                SKU/Barcode
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Stock
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.products.map((product) => (
              <tr key={product.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {product.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {product.sku || product.barcode || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {product.category_name || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {formatCurrency(product.selling_price)}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={
                      product.stock_quantity <= product.min_stock_level
                        ? "font-semibold text-red-600"
                        : "text-gray-900"
                    }
                  >
                    {product.stock_quantity}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(product.id)}
                    className="mr-4 text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingProduct ? "Edit Product" : "Add Product"}
        size="lg"
      >
        <ProductForm
          productId={editingProduct}
          onSuccess={() => {
            handleClose();
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}

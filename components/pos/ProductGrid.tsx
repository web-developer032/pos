"use client";

import { useState } from "react";
import {
  useGetProductsQuery,
  useUpdateProductMutation,
} from "@/lib/api/productsApi";
import { useGetCategoriesQuery } from "@/lib/api/categoriesApi";
import { useAppDispatch } from "@/lib/hooks";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { addItem } from "@/lib/slices/cartSlice";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export function ProductGrid() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading, refetch } = useGetProductsQuery({
    search: debouncedSearch || undefined,
    categoryId,
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const [updateProduct] = useUpdateProductMutation();
  const dispatch = useAppDispatch();
  const { format: formatCurrency } = useCurrency();

  const handleAddToCart = (product: any) => {
    dispatch(
      addItem({
        product_id: product.id,
        name: product.name,
        price: product.selling_price,
        quantity: 1,
        stock_quantity: product.stock_quantity,
      })
    );
    toast.success("Added to cart");
  };

  const handleEditPrice = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(product);
    setNewPrice(product.selling_price.toString());
  };

  const handleCloseEditModal = () => {
    setEditingProduct(null);
    setNewPrice("");
  };

  const handleSavePrice = async () => {
    if (!editingProduct || !newPrice) return;

    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      await updateProduct({
        id: editingProduct.id,
        data: { selling_price: price },
      }).unwrap();
      toast.success("Price updated successfully");
      refetch();
      handleCloseEditModal();
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to update price");
    }
  };

  if (isLoading) {
    return <div>Loading products...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
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
          className="w-full sm:w-48"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {data?.products.map((product) => (
          <div
            key={product.id}
            className="group relative cursor-pointer rounded-lg border bg-white p-3 transition-shadow hover:shadow-lg sm:p-4"
            onClick={() => handleAddToCart(product)}
          >
            <button
              onClick={(e) => handleEditPrice(product, e)}
              className="absolute right-2 top-2 rounded-md bg-gray-100 p-1.5 opacity-0 transition-opacity hover:bg-gray-200 group-hover:opacity-100"
              title="Edit price"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <h3 className="mb-2 truncate pr-8 font-semibold">{product.name}</h3>
            <p className="mb-2 text-xl font-bold text-indigo-600 sm:text-2xl">
              {formatCurrency(product.selling_price)}
            </p>
            <p className="text-xs text-gray-700 sm:text-sm">
              Stock: {product.stock_quantity}
            </p>
            {product.stock_quantity <= product.min_stock_level && (
              <p className="mt-1 text-xs font-semibold text-red-600">
                Low Stock!
              </p>
            )}
          </div>
        ))}
      </div>

      <Modal
        isOpen={!!editingProduct}
        onClose={handleCloseEditModal}
        title="Update Product Price"
        size="sm"
      >
        {editingProduct && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Product:</p>
              <p className="text-lg font-semibold">{editingProduct.name}</p>
            </div>
            <div>
              <p className="mb-1 text-sm text-gray-600">Current Price:</p>
              <p className="text-xl font-bold text-indigo-600">
                {formatCurrency(editingProduct.selling_price)}
              </p>
            </div>
            <Input
              label="New Selling Price"
              type="number"
              step="0.01"
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Enter new price"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseEditModal}>
                Cancel
              </Button>
              <Button onClick={handleSavePrice}>Update Price</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

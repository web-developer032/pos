"use client";

import { useState } from "react";
import { useGetProductsQuery } from "@/lib/api/productsApi";
import { useGetCategoriesQuery } from "@/lib/api/categoriesApi";
import { useAppDispatch } from "@/lib/hooks";
import { addItem } from "@/lib/slices/cartSlice";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

export function ProductGrid() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const { data, isLoading } = useGetProductsQuery({
    search: search || undefined,
    categoryId,
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const dispatch = useAppDispatch();

  const handleAddToCart = (product: any) => {
    if (product.stock_quantity <= 0) {
      toast.error("Product out of stock");
      return;
    }
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

  if (isLoading) {
    return <div>Loading products...</div>;
  }

  return (
    <div>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data?.products.map((product) => (
          <div
            key={product.id}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleAddToCart(product)}
          >
            <h3 className="font-semibold mb-2">{product.name}</h3>
            <p className="text-2xl font-bold text-indigo-600 mb-2">
              ${product.selling_price.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">
              Stock: {product.stock_quantity}
            </p>
            {product.stock_quantity <= product.min_stock_level && (
              <p className="text-xs text-red-600 mt-1">Low Stock!</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


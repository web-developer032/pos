"use client";

import { useState } from "react";
import { useGetProductsQuery } from "@/lib/api/productsApi";
import { useGetCategoriesQuery } from "@/lib/api/categoriesApi";
import { useAppDispatch } from "@/lib/hooks";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { addItem } from "@/lib/slices/cartSlice";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";

export function ProductGrid() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading } = useGetProductsQuery({
    search: debouncedSearch || undefined,
    categoryId,
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const dispatch = useAppDispatch();
  const { format: formatCurrency } = useCurrency();

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
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {data?.products.map((product) => (
          <div
            key={product.id}
            className="cursor-pointer rounded-lg border bg-white p-4 transition-shadow hover:shadow-lg"
            onClick={() => handleAddToCart(product)}
          >
            <h3 className="mb-2 font-semibold ">{product.name}</h3>
            <p className="mb-2 text-2xl font-bold text-indigo-600">
              {formatCurrency(product.selling_price)}
            </p>
            <p className="text-sm text-gray-700">
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
    </div>
  );
}

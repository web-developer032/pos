"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useGetProductsQuery,
  useUpdateProductMutation,
  useGetProductByBarcodeQuery,
} from "@/lib/api/productsApi";
import { useGetCategoriesQuery } from "@/lib/api/categoriesApi";
import { useAppDispatch } from "@/lib/hooks";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useThrottledCallback } from "@/lib/hooks/useThrottledCallback";
import { addItem } from "@/lib/slices/cartSlice";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

export function ProductGrid() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [editingProduct, setEditingProduct] = useState<{
    id: number;
    name: string;
    selling_price: number;
  } | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [barcodeToScan, setBarcodeToScan] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const processedBarcodeRef = useRef<string | null>(null);
  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading, refetch } = useGetProductsQuery({
    search: debouncedSearch || undefined,
    categoryId,
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const [updateProduct, { isLoading: isUpdatingPrice }] =
    useUpdateProductMutation();
  const dispatch = useAppDispatch();
  const { format: formatCurrency } = useCurrency();

  // Query product by barcode when barcode is detected
  const { data: barcodeProductData, error: barcodeError } =
    useGetProductByBarcodeQuery(barcodeToScan || "", {
      skip: !barcodeToScan,
    });

  // Handle barcode scan result
  useEffect(() => {
    if (
      barcodeProductData?.product &&
      barcodeToScan &&
      processedBarcodeRef.current !== barcodeToScan
    ) {
      const product = barcodeProductData.product;
      processedBarcodeRef.current = barcodeToScan;

      dispatch(
        addItem({
          product_id: product.id,
          name: product.name,
          price: product.selling_price,
          quantity: 1,
          stock_quantity: product.stock_quantity,
        })
      );
      toast.success(`${product.name} added to cart`);
      setSearch("");
      setBarcodeToScan(null);
      // Clear processed ref after a delay
      setTimeout(() => {
        processedBarcodeRef.current = null;
      }, 300);
    } else if (
      barcodeError &&
      barcodeToScan &&
      processedBarcodeRef.current !== barcodeToScan
    ) {
      processedBarcodeRef.current = barcodeToScan;
      toast.error("Product not found");
      setSearch("");
      setBarcodeToScan(null);
      setTimeout(() => {
        processedBarcodeRef.current = null;
      }, 300);
    }
  }, [barcodeProductData, barcodeError, barcodeToScan, dispatch]);

  const handleAddToCart = (product: {
    id: number;
    name: string;
    selling_price: number;
    stock_quantity: number;
  }) => {
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

  const handleEditPrice = (
    product: { id: number; selling_price: number; name: string },
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setEditingProduct(product);
    setNewPrice(product.selling_price.toString());
  };

  const handleCloseEditModal = useCallback(() => {
    setEditingProduct(null);
    setNewPrice("");
  }, []);

  const handleSavePriceInternal = useCallback(async () => {
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
      setEditingProduct(null);
      setNewPrice("");
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to update price";
      toast.error(errorMessage);
    }
  }, [editingProduct, newPrice, updateProduct, refetch]);

  const handleSavePrice = useThrottledCallback(handleSavePriceInternal, 300);

  // Detect barcode scan in search input
  // Barcode scanners typically send all characters at once and end with Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      const currentValue = search.trim();
      // Check if this looks like a barcode scan
      // Barcodes are typically:
      // - At least 8 characters long (most barcodes are 8-13+ digits)
      // - Alphanumeric with no spaces or special characters
      // - Or numeric only (EAN, UPC codes)
      const isLikelyBarcode =
        (currentValue.length >= 8 && /^[0-9A-Za-z]+$/.test(currentValue)) || // Long alphanumeric (8+ chars, no spaces)
        (currentValue.length >= 6 && /^[0-9]+$/.test(currentValue)); // Numeric barcode (6+ digits)

      if (isLikelyBarcode) {
        e.preventDefault();
        // Reset processed ref when starting a new scan
        processedBarcodeRef.current = null;
        setBarcodeToScan(currentValue);
        return;
      }
      // If not a barcode, allow normal search (don't prevent default)
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  if (isLoading) {
    return <div>Loading products...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Input
          ref={searchInputRef}
          placeholder="Search products... (or scan barcode)"
          value={search}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSavePrice();
            }}
            className="space-y-4"
          >
            <div>
              <p className="text-sm text-gray-600">
                Product:{" "}
                <span className="text-lg font-semibold">
                  {editingProduct.name}
                </span>
              </p>
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
              min="0"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="Enter new price"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseEditModal}
                disabled={isUpdatingPrice}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdatingPrice}>
                {isUpdatingPrice ? "Updating..." : "Update Price"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

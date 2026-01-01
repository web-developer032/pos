"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useGetProductsQuery,
  useUpdateProductMutation,
  useGetProductByBarcodeQuery,
  Product,
} from "@/lib/api/productsApi";
import { useGetCategoriesQuery } from "@/lib/api/categoriesApi";
import { useAppDispatch } from "@/lib/hooks";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useThrottledCallback } from "@/lib/hooks/useThrottledCallback";
import { useBarcodeScanner } from "@/lib/hooks/useBarcodeScanner";
import { addItem, addReturnItem } from "@/lib/slices/cartSlice";
import { formatPriceForInput, roundPrice } from "@/lib/utils/formHelpers";
import {
  calculateEffectiveStock,
  formatStockDisplay,
  isStockLow,
} from "@/lib/utils/productRelations";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import toast from "react-hot-toast";

interface ProductGridProps {
  isReturnMode?: boolean;
}

export function ProductGrid({ isReturnMode }: ProductGridProps = {}) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [editingProduct, setEditingProduct] = useState<{
    id: number;
    name: string;
    selling_price: number;
  } | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [barcodeToScan, setBarcodeToScan] = useState<string>("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const processedBarcodesRef = useRef<Set<string>>(new Set());
  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading, refetch } = useGetProductsQuery(
    {
      search: debouncedSearch || undefined,
      categoryId,
    },
    {
      // Refetch when component becomes visible (e.g., when switching tabs)
      refetchOnMountOrArgChange: true,
    }
  );
  const { data: categoriesData } = useGetCategoriesQuery();
  const [updateProduct, { isLoading: isUpdatingPrice }] =
    useUpdateProductMutation();
  const dispatch = useAppDispatch();
  const { format: formatCurrency } = useCurrency();

  // Barcode lookup query
  const {
    data: barcodeProductData,
    error: barcodeError,
    isFetching: isBarcodeFetching,
  } = useGetProductByBarcodeQuery(barcodeToScan, {
    skip: !barcodeToScan,
  });

  // Use barcode scanner hook for pattern detection
  const { isBarcodePattern } = useBarcodeScanner();

  // F8 keyboard shortcut to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F8") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle barcode product lookup result
  useEffect(() => {
    if (!barcodeToScan) return;

    // Skip if already processed
    if (processedBarcodesRef.current.has(barcodeToScan)) {
      return;
    }

    // Wait for query to complete - don't act on stale data
    if (isBarcodeFetching) {
      return;
    }

    // Check if we have an error (product not found)
    if (barcodeError) {
      processedBarcodesRef.current.add(barcodeToScan);
      toast.error("Product not found");
      setBarcodeToScan("");
      setSearch("");

      setTimeout(() => {
        processedBarcodesRef.current.delete(barcodeToScan);
      }, 300);
      return;
    }

    // Product found - verify the barcode matches to avoid stale data issues
    if (barcodeProductData?.product) {
      const product = barcodeProductData.product;

      // Verify this product matches the scanned barcode
      const barcodeMatches =
        product.barcode === barcodeToScan ||
        product.additional_barcodes?.includes(barcodeToScan);

      if (!barcodeMatches) {
        // Stale data - wait for correct response
        return;
      }

      processedBarcodesRef.current.add(barcodeToScan);

      // Add to cart (as return if in return mode)
      if (isReturnMode) {
        dispatch(
          addReturnItem({
            product_id: product.id,
            name: product.name,
            price: roundPrice(product.selling_price),
            quantity: 1,
            stock_quantity: product.stock_quantity,
            isReturn: true,
            costPrice: product.cost_price,
          })
        );
        toast.success(`${product.name} added as return`);
      } else {
        dispatch(
          addItem({
            product_id: product.id,
            name: product.name,
            price: roundPrice(product.selling_price),
            quantity: 1,
            stock_quantity: product.stock_quantity,
          })
        );
        toast.success(`${product.name} added to cart`);
      }

      // Clear barcode and search
      setBarcodeToScan("");
      setSearch("");

      // Clean up processed after delay
      setTimeout(() => {
        processedBarcodesRef.current.delete(barcodeToScan);
      }, 300);
    }
  }, [
    barcodeToScan,
    isReturnMode,
    barcodeProductData,
    barcodeError,
    isBarcodeFetching,
    dispatch,
  ]);

  const handleAddToCart = (product: Product, quantity?: number) => {
    const finalPrice = product.selling_price;
    const finalQuantity = quantity || 1;

    if (isReturnMode) {
      dispatch(
        addReturnItem({
          product_id: product.id,
          name: product.name,
          price: roundPrice(finalPrice),
          quantity: finalQuantity,
          stock_quantity: product.stock_quantity,
          isReturn: true,
          costPrice: product.cost_price,
        })
      );
      toast.success("Added as return");
    } else {
      dispatch(
        addItem({
          product_id: product.id,
          name: product.name,
          price: roundPrice(finalPrice),
          quantity: finalQuantity,
          stock_quantity: product.stock_quantity,
        })
      );
      toast.success("Added to cart");
    }
  };

  const handleProductClick = (product: Product) => {
    // Normal click - add 1 unit
    handleAddToCart(product);
  };

  const handleEditPrice = (
    product: { id: number; selling_price: number; name: string },
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setEditingProduct(product);
    setNewPrice(formatPriceForInput(product.selling_price));
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
        data: { selling_price: roundPrice(price) },
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

  // Handle search input - detect barcode scans
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      const currentValue = search.trim();
      // If it looks like a barcode, scan it to add to cart
      if (
        isBarcodePattern(currentValue) &&
        !processedBarcodesRef.current.has(currentValue)
      ) {
        e.preventDefault();
        setBarcodeToScan(currentValue);
      }
      // Otherwise allow normal search behavior
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.products.map((product) => (
          <div
            key={product.id}
            className="group relative cursor-pointer rounded-lg border bg-white p-3 transition-shadow hover:shadow-lg sm:p-4"
            onClick={() => handleProductClick(product)}
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
            {product.base_product_id && (
              <p className="mb-1 text-xs text-gray-500">
                Related Product (x{product.quantity_multiplier || 0})
              </p>
            )}
            <p className="mb-2 text-xl font-bold text-indigo-600 sm:text-2xl">
              {formatCurrency(product.selling_price)}
            </p>
            {(() => {
              const { effectiveStock, effectiveMinStock, isComposite } =
                calculateEffectiveStock(product);
              const stockDisplay = formatStockDisplay(
                effectiveStock,
                isComposite
              );

              return (
                <>
                  <p className="text-xs text-gray-700 sm:text-sm">
                    Stock: {stockDisplay} {product.unit || "pcs"}
                  </p>
                  {isStockLow(effectiveStock, effectiveMinStock) && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      Low Stock!
                    </p>
                  )}
                </>
              );
            })()}
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
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleSavePrice();
            }}
            className="space-y-4"
            preventEnterSubmit={true}
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
              step="0.01"
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
          </Form>
        )}
      </Modal>
    </div>
  );
}

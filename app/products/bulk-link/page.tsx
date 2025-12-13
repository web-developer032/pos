"use client";

import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetProductsQuery,
  useUpdateProductMutation,
  Product,
} from "@/lib/api/productsApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useCurrency } from "@/lib/hooks/useCurrency";
import toast from "react-hot-toast";

interface SelectedProduct {
  product: Product;
  quantity_multiplier: string;
}

export default function BulkLinkProductsPage() {
  // State
  const [selectedBaseProductId, setSelectedBaseProductId] = useState<
    number | null
  >(null);
  const [baseProductSearch, setBaseProductSearch] = useState("");
  const [linkableProductSearch, setLinkableProductSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    []
  );
  const [defaultMultiplier, setDefaultMultiplier] = useState("1");
  const [isLinking, setIsLinking] = useState(false);

  // Debounced searches
  const debouncedBaseSearch = useDebounce(baseProductSearch, 300);
  const debouncedLinkableSearch = useDebounce(linkableProductSearch, 300);

  // Hooks
  const { format: formatCurrency } = useCurrency();
  const [updateProduct] = useUpdateProductMutation();

  // Fetch base products (products without base_product_id)
  const { data: baseProductsData } = useGetProductsQuery({
    search: debouncedBaseSearch || undefined,
    limit: 50,
  });

  // Fetch linkable products (products with stock = 0 and no base_product_id)
  const { data: linkableProductsData, refetch: refetchLinkable } =
    useGetProductsQuery({
      search: debouncedLinkableSearch || undefined,
      limit: 100,
    });

  // Filter base products (only products without base_product_id)
  const baseProducts = useMemo(
    () => baseProductsData?.products.filter((p) => !p.base_product_id) || [],
    [baseProductsData?.products]
  );

  // Filter linkable products (stock = 0, no base_product_id, not the selected base product)
  const linkableProducts = useMemo(() => {
    return (
      linkableProductsData?.products.filter(
        (p) =>
          !p.base_product_id &&
          p.stock_quantity === 0 &&
          p.id !== selectedBaseProductId &&
          !selectedProducts.some((sp) => sp.product.id === p.id)
      ) || []
    );
  }, [linkableProductsData?.products, selectedBaseProductId, selectedProducts]);

  // Get selected base product details
  const selectedBaseProduct = useMemo(
    () => baseProducts.find((p) => p.id === selectedBaseProductId),
    [baseProducts, selectedBaseProductId]
  );

  // Base product options for dropdown
  const baseProductOptions = useMemo(
    () => [
      { value: "", label: "Select Base Product" },
      ...baseProducts.map((p) => ({
        value: p.id,
        label: `${p.name}${p.barcode ? ` (${p.barcode})` : ""} - Stock: ${p.stock_quantity}`,
      })),
    ],
    [baseProducts]
  );

  // Handle selecting a product to link
  const handleSelectProduct = (product: Product) => {
    setSelectedProducts((prev) => [
      ...prev,
      { product, quantity_multiplier: defaultMultiplier },
    ]);
  };

  // Handle removing a selected product
  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts((prev) =>
      prev.filter((sp) => sp.product.id !== productId)
    );
  };

  // Handle updating multiplier for a selected product
  const handleUpdateMultiplier = (productId: number, multiplier: string) => {
    setSelectedProducts((prev) =>
      prev.map((sp) =>
        sp.product.id === productId
          ? { ...sp, quantity_multiplier: multiplier }
          : sp
      )
    );
  };

  // Handle applying default multiplier to all selected
  const handleApplyDefaultMultiplier = () => {
    setSelectedProducts((prev) =>
      prev.map((sp) => ({ ...sp, quantity_multiplier: defaultMultiplier }))
    );
    toast.success("Applied default multiplier to all selected products");
  };

  // Handle bulk linking
  const handleBulkLink = async () => {
    if (!selectedBaseProductId) {
      toast.error("Please select a base product");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Please select products to link");
      return;
    }

    // Validate all multipliers
    const invalidProducts = selectedProducts.filter((sp) => {
      const mult = parseFloat(sp.quantity_multiplier);
      return isNaN(mult) || mult <= 0;
    });

    if (invalidProducts.length > 0) {
      toast.error(
        `Invalid multiplier for: ${invalidProducts.map((sp) => sp.product.name).join(", ")}`
      );
      return;
    }

    setIsLinking(true);
    let successCount = 0;
    let failCount = 0;

    for (const sp of selectedProducts) {
      try {
        await updateProduct({
          id: sp.product.id,
          data: {
            base_product_id: selectedBaseProductId,
            quantity_multiplier: parseFloat(sp.quantity_multiplier),
          },
        }).unwrap();
        successCount++;
      } catch (error) {
        console.error(`Failed to link ${sp.product.name}:`, error);
        failCount++;
      }
    }

    setIsLinking(false);

    if (failCount === 0) {
      toast.success(
        `Successfully linked ${successCount} product(s) to base product`
      );
      setSelectedProducts([]);
      refetchLinkable();
    } else {
      toast.error(`Linked ${successCount}, failed ${failCount} product(s)`);
      // Remove successfully linked products from selection
      setSelectedProducts((prev) =>
        prev.filter((sp) => {
          // Keep only products that weren't updated
          return !linkableProducts.some((lp) => lp.id === sp.product.id);
        })
      );
      refetchLinkable();
    }
  };

  return (
    <ProtectedRoute allowedRoles={["admin", "manager"]}>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Bulk Link Products</h1>
          <p className="mt-2 text-gray-600">
            Link multiple products to a base product at once. Only products with
            0 stock can be linked.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Panel - Base Product Selection */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">
              1. Select Base Product
            </h2>
            <SearchableSelect
              label="Base Product"
              options={baseProductOptions}
              value={selectedBaseProductId || ""}
              onChange={(value) =>
                setSelectedBaseProductId(value === "" ? null : Number(value))
              }
              onSearch={setBaseProductSearch}
              placeholder="Search for base product..."
              searchPlaceholder="Type to search..."
            />

            {selectedBaseProduct && (
              <div className="mt-4 space-y-3">
                {/* Base Product Info */}
                <div className="rounded-lg bg-blue-50 p-4">
                  <h3 className="font-semibold text-blue-900">
                    {selectedBaseProduct.name}
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">SKU:</span>{" "}
                      <span className="font-medium">
                        {selectedBaseProduct.sku || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Stock:</span>{" "}
                      <span className="font-medium">
                        {selectedBaseProduct.stock_quantity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing Info - Highlighted */}
                <div className="rounded-lg border-2 border-green-300 bg-green-50 p-4">
                  <h4 className="mb-2 text-sm font-semibold text-green-800">
                    💰 Base Product Pricing
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded bg-white p-3 text-center shadow-sm">
                      <p className="text-xs text-gray-500">Cost Price</p>
                      <p className="text-xl font-bold text-gray-800">
                        {formatCurrency(selectedBaseProduct.cost_price)}
                      </p>
                    </div>
                    <div className="rounded bg-white p-3 text-center shadow-sm">
                      <p className="text-xs text-gray-500">Retail Price</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(selectedBaseProduct.selling_price)}
                      </p>
                    </div>
                  </div>

                  {/* Suggested prices based on multiplier */}
                  {parseFloat(defaultMultiplier) > 0 && (
                    <div className="mt-3 border-t border-green-200 pt-3">
                      <p className="mb-2 text-xs font-medium text-green-700">
                        📊 Suggested Sub-Product Prices (×{defaultMultiplier}):
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Cost:</span>{" "}
                          <span className="font-semibold text-gray-800">
                            {formatCurrency(
                              selectedBaseProduct.cost_price *
                                parseFloat(defaultMultiplier)
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Retail:</span>{" "}
                          <span className="font-semibold text-green-600">
                            {formatCurrency(
                              selectedBaseProduct.selling_price *
                                parseFloat(defaultMultiplier)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Default Multiplier Setting */}
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                Default Multiplier
              </h3>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={defaultMultiplier}
                  onChange={(e) => setDefaultMultiplier(e.target.value)}
                  placeholder="e.g., 0.7"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyDefaultMultiplier}
                  disabled={selectedProducts.length === 0}
                >
                  Apply to All
                </Button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Set a default multiplier for newly selected products
              </p>
            </div>
          </div>

          {/* Right Panel - Products to Link */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">
              2. Select Products to Link
            </h2>

            <Input
              placeholder="Search products with 0 stock..."
              value={linkableProductSearch}
              onChange={(e) => setLinkableProductSearch(e.target.value)}
              className="mb-4"
            />

            {/* Available Products */}
            <div className="mb-4 max-h-48 overflow-y-auto rounded border border-gray-200">
              {linkableProducts.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">
                  No eligible products found. Products must have 0 stock and not
                  be already linked.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {linkableProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex cursor-pointer items-center justify-between p-3 hover:bg-gray-50"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">
                          {product.barcode || "No barcode"} |{" "}
                          {formatCurrency(product.selling_price)}
                        </p>
                      </div>
                      <Button type="button" variant="outline" size="sm">
                        + Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Products */}
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              Selected Products ({selectedProducts.length})
            </h3>
            <div className="max-h-80 overflow-y-auto rounded border border-green-200 bg-green-50">
              {selectedProducts.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">
                  Click on products above to add them
                </p>
              ) : (
                <div className="divide-y divide-green-100">
                  {selectedProducts.map((sp) => {
                    const mult = parseFloat(sp.quantity_multiplier) || 0;
                    const suggestedCost = selectedBaseProduct
                      ? selectedBaseProduct.cost_price * mult
                      : 0;
                    const suggestedRetail = selectedBaseProduct
                      ? selectedBaseProduct.selling_price * mult
                      : 0;

                    return (
                      <div key={sp.product.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {sp.product.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              Current:{" "}
                              {formatCurrency(sp.product.selling_price)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">×</span>
                            <Input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={sp.quantity_multiplier}
                              onChange={(e) =>
                                handleUpdateMultiplier(
                                  sp.product.id,
                                  e.target.value
                                )
                              }
                              className="w-20"
                              placeholder="Mult."
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(sp.product.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                        {/* Suggested prices based on multiplier */}
                        {mult > 0 && selectedBaseProduct && (
                          <div className="mt-2 flex gap-4 rounded bg-white/50 px-2 py-1 text-xs">
                            <span className="text-gray-500">
                              Suggested Cost:{" "}
                              <span className="font-semibold text-gray-700">
                                {formatCurrency(suggestedCost)}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              Suggested Retail:{" "}
                              <span className="font-semibold text-green-600">
                                {formatCurrency(suggestedRetail)}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-6 flex items-center justify-between rounded-lg bg-gray-100 p-4">
          <div className="text-sm text-gray-600">
            {selectedBaseProductId ? (
              <>
                Linking{" "}
                <span className="font-semibold">{selectedProducts.length}</span>{" "}
                product(s) to{" "}
                <span className="font-semibold">
                  {selectedBaseProduct?.name}
                </span>
              </>
            ) : (
              "Select a base product to begin"
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedProducts([])}
              disabled={selectedProducts.length === 0 || isLinking}
            >
              Clear Selection
            </Button>
            <Button
              type="button"
              onClick={handleBulkLink}
              disabled={
                !selectedBaseProductId ||
                selectedProducts.length === 0 ||
                isLinking
              }
            >
              {isLinking
                ? `Linking ${selectedProducts.length} products...`
                : `Link ${selectedProducts.length} Product(s)`}
            </Button>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

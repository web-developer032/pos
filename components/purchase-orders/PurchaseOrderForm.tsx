"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreatePurchaseOrderMutation,
  useGetPurchaseOrderQuery,
  useUpdatePurchaseOrderItemsMutation,
} from "@/lib/api/purchaseOrdersApi";
import { useGetSuppliersQuery } from "@/lib/api/suppliersApi";
import {
  useGetProductsQuery,
  type Product,
  ProductUnit,
} from "@/lib/api/productsApi";
import { ProductForm } from "@/components/products/ProductForm";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Form } from "@/components/ui/Form";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useDebounce } from "@/lib/hooks/useDebounce";
import {
  useFormBarcodeScanner,
  useBarcodeHandler,
} from "@/lib/hooks/useBarcodeScanner";
import { useOrderCalculations } from "@/lib/hooks/useOrderCalculations";
import { useScrollToError } from "@/lib/hooks/useScrollToError";
import { InlineSupplierForm } from "./InlineSupplierForm";
import { PurchaseOrderItem } from "./PurchaseOrderItem";
import { OrderSummary } from "./OrderSummary";
import toast from "react-hot-toast";

// Schema
const purchaseOrderSchema = z.object({
  supplier_id: z
    .number()
    .refine((val) => val > 0, { message: "Supplier is required" }),
  items: z
    .array(
      z.object({
        product_id: z
          .number()
          .refine((val) => val > 0, { message: "Product is required" }),
        product_name: z.string().optional(),
        quantity: z.number().min(0.001, "Min 0.001"),
        unit_cost: z.number().min(0, "Min 0"),
        retail_price: z.number().min(0).optional(),
      })
    )
    .min(1, "At least one item required"),
  discount_type: z.enum(["percentage", "amount"]).optional(),
  discount_value: z.number().min(0).optional(),
  tax_type: z.enum(["percentage", "amount"]).optional(),
  tax_value: z.number().min(0).optional(),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

interface PurchaseOrderFormProps {
  purchaseOrderId?: number;
  onSuccess?: () => void;
}

export function PurchaseOrderForm({
  purchaseOrderId,
  onSuccess,
}: PurchaseOrderFormProps) {
  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productModalIndex, setProductModalIndex] = useState<number | null>(
    null
  );
  const [productSearch, setProductSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);

  // Refs
  const productInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>(
    {}
  );
  const productsCache = useRef<Map<number, Product>>(new Map());
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const suppliersCache = useRef<Map<number, { id: number; name: string }>>(
    new Map()
  );

  // Hooks
  const { format: formatCurrency } = useCurrency();
  const debouncedProductSearch = useDebounce(productSearch, 200);
  const debouncedSupplierSearch = useDebounce(supplierSearch, 200);
  const { barcodeToScan, handleBarcodeKeyDown, clearBarcodeState } =
    useFormBarcodeScanner();

  // API Queries - fetch suppliers with search
  const { data: suppliersData, refetch: refetchSuppliers } =
    useGetSuppliersQuery({
      limit: 100,
      search: debouncedSupplierSearch || undefined,
    });
  const { data: productsData, refetch: refetchProducts } = useGetProductsQuery({
    search: debouncedProductSearch || undefined,
    limit: 1000,
  });
  const { data: purchaseOrderData } = useGetPurchaseOrderQuery(
    purchaseOrderId!,
    {
      skip: !purchaseOrderId,
    }
  );

  // Mutations
  const [createPurchaseOrder] = useCreatePurchaseOrderMutation();
  const [updatePurchaseOrderItems] = useUpdatePurchaseOrderItemsMutation();

  const isEditMode = !!purchaseOrderId;

  // Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplier_id: 0,
      items: [
        {
          product_id: 0,
          product_name: "",
          quantity: 1,
          unit_cost: 0,
          retail_price: 0,
        },
      ],
      discount_type: undefined,
      discount_value: undefined,
      tax_type: undefined,
      tax_value: undefined,
    },
  });

  const { fields, prepend, remove } = useFieldArray({ control, name: "items" });

  // Ref for the scrollable items container
  const itemsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to first error on validation failure
  useScrollToError(errors, {
    showToast: true,
    scrollOffset: 120,
    containerRef: itemsContainerRef,
  });

  const watchedItems = watch("items");
  const discountType = watch("discount_type");
  const discountValue = watch("discount_value");
  const taxType = watch("tax_type");
  const taxValue = watch("tax_value");

  // Calculations
  const {
    subtotal,
    discountAmount,
    taxAmount,
    total,
    discountFactor,
    taxFactor,
  } = useOrderCalculations(
    watchedItems,
    discountType,
    discountValue,
    taxType,
    taxValue
  );

  // Cache products from API
  useEffect(() => {
    if (productsData?.products) {
      productsData.products.forEach((product) => {
        productsCache.current.set(product.id, product);
      });
    }
  }, [productsData]);

  // Cache suppliers from API
  useEffect(() => {
    if (suppliersData?.suppliers) {
      suppliersData.suppliers.forEach((supplier) => {
        suppliersCache.current.set(supplier.id, {
          id: supplier.id,
          name: supplier.name,
        });
      });
    }
  }, [suppliersData]);

  // Close supplier dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        supplierDropdownRef.current &&
        !supplierDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSupplierDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load existing data when editing
  useEffect(() => {
    if (purchaseOrderData && isEditMode) {
      const { purchase_order, items } = purchaseOrderData;

      // Populate cache from API response
      items.forEach((item) => {
        if (
          item.product_id &&
          item.product_name &&
          item.product_name !== "Deleted Product"
        ) {
          const productData: Product = {
            id: item.product_id,
            name: item.product_name,
            sku: (item as { product_sku?: string }).product_sku || "",
            barcode:
              (item as { product_barcode?: string }).product_barcode ||
              undefined,
            cost_price:
              (item as { product_cost_price?: number }).product_cost_price ??
              item.unit_cost,
            selling_price:
              (item as { product_selling_price?: number })
                .product_selling_price ?? 0,
            stock_quantity: 0,
            min_stock_level: 0,
            category_id: undefined,
            image_url: undefined,
            unit: "piece" as ProductUnit,
            base_product_id: undefined,
            quantity_multiplier: undefined,
          };
          productsCache.current.set(item.product_id, productData);
        }
      });

      reset({
        supplier_id: purchase_order.supplier_id,
        items:
          items.length > 0
            ? items.map((item) => ({
                product_id: item.product_id,
                product_name: item.product_name || "",
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                retail_price:
                  item.retail_price || item.product_selling_price || 0,
              }))
            : [
                {
                  product_id: 0,
                  product_name: "",
                  quantity: 1,
                  unit_cost: 0,
                  retail_price: 0,
                },
              ],
        discount_type: purchase_order.discount_type || undefined,
        discount_value: purchase_order.discount_value || undefined,
        tax_type: purchase_order.tax_type || undefined,
        tax_value: purchase_order.tax_value || undefined,
      });
    }
  }, [purchaseOrderData, isEditMode, reset]);

  // Barcode handler
  useBarcodeHandler(barcodeToScan, {
    onProductFound: useCallback(
      (index: number, product: Product) => {
        productsCache.current.set(product.id, product);
        setValue(`items.${index}.product_id`, product.id, {
          shouldValidate: true,
        });
        setValue(`items.${index}.product_name`, product.name);
        setValue(`items.${index}.unit_cost`, product.cost_price);
        setValue(`items.${index}.retail_price`, product.selling_price);
        setProductSearch("");
        clearBarcodeState();
      },
      [setValue, clearBarcodeState]
    ),
    onProductNotFound: useCallback(() => {
      setProductSearch("");
      clearBarcodeState();
    }, [clearBarcodeState]),
    inputRefs: productInputRefs,
  });

  // Product options for dropdown
  const productOptions = useMemo(() => {
    const searchResults = productsData?.products || [];
    const optionsMap = new Map<number, { value: number; label: string }>();

    // Add search results
    searchResults.forEach((p) => {
      optionsMap.set(p.id, {
        value: p.id,
        label: `${p.name} - ${formatCurrency(p.cost_price)}`,
      });
    });

    // Add cached products for selected items not in search
    const searchResultIds = new Set(searchResults.map((p) => p.id));
    watchedItems.forEach((item) => {
      if (item.product_id > 0 && !searchResultIds.has(item.product_id)) {
        const cached = productsCache.current.get(item.product_id);
        if (cached) {
          optionsMap.set(item.product_id, {
            value: cached.id,
            label: `${cached.name} - ${formatCurrency(cached.cost_price)}`,
          });
        }
      }
    });

    return Array.from(optionsMap.values());
  }, [productsData?.products, watchedItems, formatCurrency]);

  // Filter items based on search
  const filteredFieldsWithIndex = useMemo(() => {
    if (!itemSearch.trim()) {
      return fields.map((field, index) => ({ field, index }));
    }
    const searchLower = itemSearch.toLowerCase();
    return fields
      .map((field, index) => ({ field, index }))
      .filter(({ index }) => {
        const item = watchedItems[index];
        const productName = item?.product_name?.toLowerCase() || "";
        const cachedProduct = productsCache.current.get(item?.product_id || 0);
        const cachedName = cachedProduct?.name?.toLowerCase() || "";
        return (
          productName.includes(searchLower) || cachedName.includes(searchLower)
        );
      });
  }, [fields, watchedItems, itemSearch]);

  // Handlers
  const handleAddItem = useCallback(() => {
    prepend({
      product_id: 0,
      product_name: "",
      quantity: 1,
      unit_cost: 0,
      retail_price: 0,
    });
    setTimeout(() => {
      productInputRefs.current[0]?.focus();
      productInputRefs.current[0]?.click();
    }, 200);
  }, [prepend]);

  const handleProductChange = useCallback(
    (index: number, productId: number) => {
      const product =
        productsData?.products.find((p) => p.id === productId) ||
        productsCache.current.get(productId);
      if (product) {
        productsCache.current.set(productId, product);
        setValue(`items.${index}.product_id`, productId, {
          shouldValidate: true,
        });
        setValue(`items.${index}.product_name`, product.name);
        setValue(`items.${index}.unit_cost`, product.cost_price);
        setValue(`items.${index}.retail_price`, product.selling_price);
        setProductSearch("");
      }
    },
    [productsData?.products, setValue]
  );

  const handleDiscountTypeChange = useCallback(
    (value: string) => {
      if (value === "") {
        setValue("discount_value", undefined);
      }
    },
    [setValue]
  );

  const handleTaxTypeChange = useCallback(
    (value: string) => {
      if (value === "") {
        setValue("tax_value", undefined);
      }
    },
    [setValue]
  );

  const onSubmit = async (data: PurchaseOrderFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const submitData = {
        supplier_id: data.supplier_id,
        items: data.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name || undefined,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          retail_price: item.retail_price || undefined,
        })),
        ...(data.discount_type && data.discount_value
          ? {
              discount_type: data.discount_type,
              discount_value: data.discount_value,
            }
          : {}),
        ...(data.tax_type && data.tax_value
          ? {
              tax_type: data.tax_type,
              tax_value: data.tax_value,
            }
          : {}),
      };

      if (isEditMode && purchaseOrderId) {
        await updatePurchaseOrderItems({
          id: purchaseOrderId,
          data: submitData,
        }).unwrap();
        toast.success("Purchase order updated");
      } else {
        await createPurchaseOrder(submitData).unwrap();
        toast.success("Purchase order created");
        reset();
      }
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as { data?: { error?: string } };
      toast.error(
        err.data?.error ||
          `Failed to ${isEditMode ? "update" : "create"} purchase order`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        preventEnterSubmit
      >
        {/* Supplier Selection */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Controller
            name="supplier_id"
            control={control}
            render={({ field }) => {
              const selectedSupplier = suppliersCache.current.get(field.value);
              const selectedName = selectedSupplier?.name || "";

              return (
                <div ref={supplierDropdownRef} className="relative">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Supplier
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search suppliers..."
                      value={
                        isSupplierDropdownOpen ? supplierSearch : selectedName
                      }
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        if (!isSupplierDropdownOpen) {
                          setIsSupplierDropdownOpen(true);
                        }
                      }}
                      onFocus={() => {
                        setIsSupplierDropdownOpen(true);
                        setSupplierSearch("");
                      }}
                      className={`w-full rounded-md border px-3 py-2 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        errors.supplier_id
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <svg
                        className="h-4 w-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Dropdown */}
                  {isSupplierDropdownOpen && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                      {suppliersData?.suppliers &&
                      suppliersData.suppliers.length > 0 ? (
                        suppliersData.suppliers.map((supplier) => (
                          <button
                            key={supplier.id}
                            type="button"
                            onClick={() => {
                              field.onChange(supplier.id);
                              suppliersCache.current.set(supplier.id, {
                                id: supplier.id,
                                name: supplier.name,
                              });
                              setIsSupplierDropdownOpen(false);
                              setSupplierSearch("");
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 ${
                              field.value === supplier.id
                                ? "bg-indigo-100 text-indigo-700"
                                : "text-gray-700"
                            }`}
                          >
                            <div className="font-medium">{supplier.name}</div>
                            {supplier.phone && (
                              <div className="text-xs text-gray-500">
                                {supplier.phone}
                              </div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
                          {supplierSearch
                            ? "No suppliers found"
                            : "Type to search suppliers"}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowSupplierModal(true);
                          setIsSupplierDropdownOpen(false);
                        }}
                        className="w-full border-t border-gray-200 px-3 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50"
                      >
                        + Add New Supplier
                      </button>
                    </div>
                  )}

                  {errors.supplier_id && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.supplier_id.message}
                    </p>
                  )}
                </div>
              );
            }}
          />
        </div>

        {/* Items Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Items{" "}
              <span className="text-gray-400">
                ({filteredFieldsWithIndex.length}
                {itemSearch && ` of ${fields.length}`})
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search added items..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="h-8 w-48 rounded-md border border-gray-300 pl-8 pr-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <svg
                  className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {itemSearch && (
                  <button
                    type="button"
                    onClick={() => setItemSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
              >
                + Add Item
              </Button>
            </div>
          </div>

          <div
            ref={itemsContainerRef}
            className="form-scrollbar max-h-[450px] space-y-3 overflow-y-auto pr-1"
          >
            {filteredFieldsWithIndex.length === 0 && itemSearch ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <p className="text-sm text-gray-500">
                  No items found matching &ldquo;{itemSearch}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => setItemSearch("")}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredFieldsWithIndex.map(({ field, index }) => (
                <PurchaseOrderItem
                  key={field.id}
                  ref={(el) => {
                    productInputRefs.current[index] = el;
                  }}
                  index={index}
                  itemNumber={index + 1}
                  canRemove={fields.length > 1}
                  productId={watchedItems[index]?.product_id || 0}
                  productName={watchedItems[index]?.product_name || ""}
                  quantity={watchedItems[index]?.quantity || 0}
                  unitCost={watchedItems[index]?.unit_cost || 0}
                  retailPrice={watchedItems[index]?.retail_price || 0}
                  discountFactor={discountFactor}
                  taxFactor={taxFactor}
                  productOptions={productOptions}
                  errors={errors.items?.[index]}
                  register={register}
                  onProductChange={(productId) =>
                    handleProductChange(index, productId)
                  }
                  onProductSearch={setProductSearch}
                  onBarcodeKeyDown={(e) => handleBarcodeKeyDown(index, e)}
                  onRemove={() => remove(index)}
                  onAddProduct={() => {
                    setProductModalIndex(index);
                    setShowProductModal(true);
                  }}
                />
              ))
            )}
          </div>

          {errors.items?.message && (
            <p className="text-sm text-red-600">{errors.items.message}</p>
          )}
        </div>

        {/* Order Summary */}
        <OrderSummary
          subtotal={subtotal}
          discountType={discountType}
          discountValue={discountValue}
          discountAmount={discountAmount}
          taxType={taxType}
          taxValue={taxValue}
          taxAmount={taxAmount}
          total={total}
          control={control}
          register={register}
          errors={errors}
          onDiscountTypeChange={handleDiscountTypeChange}
          onTaxTypeChange={handleTaxTypeChange}
        />

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[180px]"
          >
            {isSubmitting
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
                ? "Update Purchase Order"
                : "Create Purchase Order"}
          </Button>
        </div>
      </Form>

      {/* Supplier Modal */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        title="Add New Supplier"
      >
        <InlineSupplierForm
          onSuccess={async (supplierId) => {
            await refetchSuppliers();
            setValue("supplier_id", supplierId);
            setShowSupplierModal(false);
            toast.success("Supplier created and selected");
          }}
        />
      </Modal>

      {/* Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setProductModalIndex(null);
        }}
        title="Add New Product"
        size="lg"
      >
        <ProductForm
          onProductCreated={(product) => {
            if (productModalIndex !== null) {
              productsCache.current.set(product.id, product as Product);
              setValue(`items.${productModalIndex}.product_id`, product.id, {
                shouldValidate: true,
              });
              setValue(`items.${productModalIndex}.product_name`, product.name);
              setValue(
                `items.${productModalIndex}.unit_cost`,
                product.cost_price
              );
              setProductSearch("");
              refetchProducts();
              toast.success(`${product.name} created and selected`);
            }
            setShowProductModal(false);
            setProductModalIndex(null);
          }}
          onSuccess={() => {}}
        />
      </Modal>
    </>
  );
}

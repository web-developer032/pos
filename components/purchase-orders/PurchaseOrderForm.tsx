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
import { Select } from "@/components/ui/Select";
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
        quantity: z.number().int().min(1, "Min 1"),
        unit_cost: z.number().min(0, "Min 0"),
        retail_price: z.number().min(0).optional(),
      })
    )
    .min(1, "At least one item required"),
  discount_type: z.enum(["percentage", "amount"]).optional(),
  discount_value: z.number().min(0).optional(),
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

  // Refs
  const productInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>(
    {}
  );
  const productsCache = useRef<Map<number, Product>>(new Map());

  // Hooks
  const { format: formatCurrency } = useCurrency();
  const debouncedProductSearch = useDebounce(productSearch, 200);
  const { barcodeToScan, handleBarcodeKeyDown, clearBarcodeState } =
    useFormBarcodeScanner();

  // API Queries
  const { data: suppliersData, refetch: refetchSuppliers } =
    useGetSuppliersQuery();
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
      items: [{ product_id: 0, quantity: 1, unit_cost: 0, retail_price: 0 }],
      discount_type: undefined,
      discount_value: undefined,
    },
  });

  const { fields, prepend, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const discountType = watch("discount_type");
  const discountValue = watch("discount_value");

  // Calculations
  const { subtotal, discountAmount, total } = useOrderCalculations(
    watchedItems,
    discountType,
    discountValue
  );

  // Cache products from API
  useEffect(() => {
    if (productsData?.products) {
      productsData.products.forEach((product) => {
        productsCache.current.set(product.id, product);
      });
    }
  }, [productsData]);

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
                quantity: item.quantity,
                unit_cost: item.unit_cost,
                retail_price:
                  item.retail_price || item.product_selling_price || 0,
              }))
            : [{ product_id: 0, quantity: 1, unit_cost: 0, retail_price: 0 }],
        discount_type: purchase_order.discount_type || undefined,
        discount_value: purchase_order.discount_value || undefined,
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

  // Handlers
  const handleAddItem = useCallback(() => {
    prepend({ product_id: 0, quantity: 1, unit_cost: 0, retail_price: 0 });
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

  const onSubmit = async (data: PurchaseOrderFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const submitData = {
        supplier_id: data.supplier_id,
        items: data.items.map((item) => ({
          product_id: item.product_id,
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

  // Supplier options
  const supplierOptions = useMemo(
    () => [
      { value: 0, label: "Select Supplier" },
      ...(suppliersData?.suppliers.map((s) => ({
        value: s.id,
        label: s.name,
      })) || []),
    ],
    [suppliersData?.suppliers]
  );

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
            render={({ field }) => (
              <div>
                <Select
                  label="Supplier"
                  options={supplierOptions}
                  value={field.value?.toString() || "0"}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "0" ? 0 : Number(e.target.value)
                    )
                  }
                  error={errors.supplier_id?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(true)}
                  className="mt-1 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  + Add New Supplier
                </button>
              </div>
            )}
          />
        </div>

        {/* Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              Items <span className="text-gray-400">({fields.length})</span>
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
            >
              + Add Item
            </Button>
          </div>

          <div className="form-scrollbar max-h-[450px] space-y-3 overflow-y-auto pr-1">
            {fields.map((field, index) => (
              <PurchaseOrderItem
                key={field.id}
                ref={(el) => {
                  productInputRefs.current[index] = el;
                }}
                index={index}
                itemNumber={index + 1}
                canRemove={fields.length > 1}
                productId={watchedItems[index]?.product_id || 0}
                quantity={watchedItems[index]?.quantity || 0}
                unitCost={watchedItems[index]?.unit_cost || 0}
                retailPrice={watchedItems[index]?.retail_price || 0}
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
            ))}
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
          total={total}
          control={control}
          register={register}
          errors={errors}
          onDiscountTypeChange={handleDiscountTypeChange}
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

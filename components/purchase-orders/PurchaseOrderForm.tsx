"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreatePurchaseOrderMutation,
  useGetPurchaseOrderQuery,
  useUpdatePurchaseOrderItemsMutation,
} from "@/lib/api/purchaseOrdersApi";
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
} from "@/lib/api/suppliersApi";
import {
  useGetProductsQuery,
  useGetProductByBarcodeQuery,
  type Product,
} from "@/lib/api/productsApi";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useDebounce } from "@/lib/hooks/useDebounce";
import toast from "react-hot-toast";

const purchaseOrderSchema = z.object({
  supplier_id: z.number().refine((val) => val > 0, {
    message: "Supplier is required",
  }),
  items: z
    .array(
      z.object({
        product_id: z.number().refine((val) => val > 0, {
          message: "Product is required",
        }),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
        unit_cost: z.number().min(0, "Unit cost must be 0 or greater"),
      })
    )
    .min(1, "At least one item is required"),
  discount_type: z.enum(["percentage", "amount"]).optional(),
  discount_value: z.number().min(0).optional(),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

interface PurchaseOrderFormProps {
  purchaseOrderId?: number;
  onSuccess?: () => void;
}

// Inline Supplier Form Component
function InlineSupplierForm({
  onSuccess,
}: {
  onSuccess: (supplierId: number) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
    },
  });
  const [createSupplier] = useCreateSupplierMutation();

  const onSubmit = async (data: {
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
  }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createSupplier({
        name: data.name,
        contact_person: data.contact_person || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
      }).unwrap();
      onSuccess(result.supplier.id);
    } catch (error: unknown) {
      const err = error as { data?: { error?: string } };
      toast.error(err.data?.error || "Failed to create supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Name *"
        {...register("name", { required: "Name is required" })}
        error={errors.name?.message as string}
      />
      <Input
        label="Contact Person"
        {...register("contact_person")}
        error={errors.contact_person?.message as string}
      />
      <Input
        label="Email"
        type="email"
        {...register("email")}
        error={errors.email?.message as string}
      />
      <Input
        label="Phone"
        {...register("phone")}
        error={errors.phone?.message as string}
      />
      <Input
        label="Address"
        {...register("address")}
        error={errors.address?.message as string}
      />
      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create"}
        </Button>
      </div>
    </form>
  );
}

export function PurchaseOrderForm({
  purchaseOrderId,
  onSuccess,
}: PurchaseOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [barcodeToScan, setBarcodeToScan] = useState<{
    index: number;
    barcode: string;
  } | null>(null);
  const productInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>(
    {}
  );
  const productsCache = useRef<Map<number, Product>>(new Map());

  const { data: suppliersData, refetch: refetchSuppliers } =
    useGetSuppliersQuery();
  const debouncedProductSearch = useDebounce(productSearch, 300);

  // Single query for products with search - more efficient
  const { data: productsData } = useGetProductsQuery({
    search: debouncedProductSearch || undefined,
    limit: 1000,
  });

  // Query product by barcode when scanning
  const {
    data: barcodeProductData,
    error: barcodeError,
    isLoading: isBarcodeLoading,
  } = useGetProductByBarcodeQuery(barcodeToScan?.barcode || "", {
    skip: !barcodeToScan?.barcode,
  });

  const { data: purchaseOrderData } = useGetPurchaseOrderQuery(
    purchaseOrderId!,
    {
      skip: !purchaseOrderId,
    }
  );
  const [createPurchaseOrder] = useCreatePurchaseOrderMutation();
  const [updatePurchaseOrderItems] = useUpdatePurchaseOrderItemsMutation();
  const { format: formatCurrency } = useCurrency();
  const isEditMode = !!purchaseOrderId;

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
      items: [{ product_id: 0, quantity: 1, unit_cost: 0 }],
      discount_type: undefined,
      discount_value: undefined,
    },
  });

  const { fields, prepend, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = watch("items");
  const discountType = watch("discount_type");
  const discountValue = watch("discount_value");

  // Update cache when products are loaded
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
      reset({
        supplier_id: purchase_order.supplier_id,
        items:
          items.length > 0
            ? items.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_cost: item.unit_cost,
              }))
            : [{ product_id: 0, quantity: 1, unit_cost: 0 }],
        discount_type: purchase_order.discount_type || undefined,
        discount_value: purchase_order.discount_value || undefined,
      });
    }
  }, [purchaseOrderData, isEditMode, reset]);

  // Handle barcode scan - auto-select product when found
  useEffect(() => {
    if (!barcodeToScan || !barcodeProductData?.product) return;

    const { index, barcode } = barcodeToScan;
    const product = barcodeProductData.product;

    // Verify barcode matches
    const matchesPrimaryBarcode = product.barcode === barcode;
    const matchesAdditionalBarcode =
      product.additional_barcodes?.includes(barcode) || false;

    if (matchesPrimaryBarcode || matchesAdditionalBarcode) {
      // Cache and select product
      productsCache.current.set(product.id, product);
      setValue(`items.${index}.product_id`, product.id, {
        shouldValidate: true,
      });
      setValue(`items.${index}.unit_cost`, product.cost_price);
      setProductSearch("");
      toast.success(`${product.name} selected`);
      setBarcodeToScan(null);
    }
  }, [barcodeToScan, barcodeProductData, setValue]);

  // Handle barcode error
  useEffect(() => {
    if (barcodeToScan && barcodeError && !isBarcodeLoading) {
      toast.error("Product not found");
      setBarcodeToScan(null);
    }
  }, [barcodeToScan, barcodeError, isBarcodeLoading]);

  const handleAddItem = () => {
    prepend({ product_id: 0, quantity: 1, unit_cost: 0 });
    setTimeout(() => {
      const productInput = productInputRefs.current[0];
      if (productInput) {
        productInput.focus();
        productInput.click();
      }
    }, 100);
  };

  const handleProductChange = (index: number, productId: number) => {
    const product =
      productsData?.products.find((p) => p.id === productId) ||
      productsCache.current.get(productId);

    if (product) {
      productsCache.current.set(productId, product);
      setValue(`items.${index}.unit_cost`, product.cost_price);
      setProductSearch("");
    }
  };

  // Handle barcode keydown - detect barcode scan
  const handleBarcodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      const value = e.currentTarget.value.trim();
      const isBarcode =
        (value.length >= 8 && /^[0-9A-Za-z]+$/.test(value)) ||
        (value.length >= 6 && /^[0-9]+$/.test(value));

      if (isBarcode && value) {
        e.preventDefault();
        setBarcodeToScan({ index, barcode: value });
      }
    }
  };

  // Memoized product options - optimized
  const getProductOptions = useMemo(() => {
    const searchResults = productsData?.products || [];
    const selectedProductIds = watchedItems
      .map((item) => item.product_id)
      .filter((id): id is number => id > 0 && id !== null);

    const searchResultIds = new Set(searchResults.map((p) => p.id));
    const options = searchResults.map((p) => ({
      value: p.id,
      label: `${p.name} - ${formatCurrency(p.cost_price)}`,
    }));

    // Add cached products for selected items not in search results
    selectedProductIds.forEach((productId) => {
      if (!searchResultIds.has(productId)) {
        const cachedProduct = productsCache.current.get(productId);
        if (cachedProduct) {
          options.push({
            value: cachedProduct.id,
            label: `${cachedProduct.name} - ${formatCurrency(
              cachedProduct.cost_price
            )}`,
          });
        }
      }
    });

    // Remove duplicates
    return Array.from(new Map(options.map((opt) => [opt.value, opt])).values());
  }, [productsData?.products, watchedItems, formatCurrency]);

  const calculateTotal = () => {
    const subtotal = watchedItems.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0),
      0
    );

    if (!discountType || !discountValue || discountValue <= 0) {
      return subtotal;
    }

    if (discountType === "percentage") {
      const discountAmount = (subtotal * discountValue) / 100;
      return subtotal - discountAmount;
    } else {
      // amount
      return Math.max(0, subtotal - discountValue);
    }
  };

  const calculateDiscountAmount = () => {
    const subtotal = watchedItems.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0),
      0
    );

    if (!discountType || !discountValue || discountValue <= 0) {
      return 0;
    }

    if (discountType === "percentage") {
      return (subtotal * discountValue) / 100;
    } else {
      return discountValue;
    }
  };

  const onSubmit = async (data: PurchaseOrderFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const items = data.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
      }));

      const submitData = {
        supplier_id: data.supplier_id,
        items,
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
        toast.success("Purchase order updated successfully");
      } else {
        await createPurchaseOrder(submitData).unwrap();
        toast.success("Purchase order created successfully");
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Controller
            name="supplier_id"
            control={control}
            render={({ field }) => (
              <div>
                <Select
                  label="Supplier *"
                  options={[
                    { value: 0, label: "Select Supplier" },
                    ...(suppliersData?.suppliers.map((s) => ({
                      value: s.id,
                      label: s.name,
                    })) || []),
                  ]}
                  value={field.value?.toString() || "0"}
                  onChange={(e) => {
                    field.onChange(
                      e.target.value === "0" ? 0 : Number(e.target.value)
                    );
                  }}
                  error={errors.supplier_id?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(true)}
                  className="mt-1 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  + Add New Supplier
                </button>
              </div>
            )}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Items *</label>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddItem}
              className="text-sm"
            >
              + Add Item
            </Button>
          </div>

          <div className="form-scrollbar max-h-[400px] space-y-4 overflow-y-auto pr-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-3 rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    Item {index + 1}
                  </span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => remove(index)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <SearchableSelect
                    ref={(el) => {
                      productInputRefs.current[index] = el;
                    }}
                    label="Product *"
                    options={[
                      { value: 0, label: "Select Product" },
                      ...getProductOptions,
                    ]}
                    value={watch(`items.${index}.product_id`) || 0}
                    onChange={(val) => {
                      const productId = Number(val);
                      if (productId > 0) {
                        setValue(`items.${index}.product_id`, productId, {
                          shouldValidate: true,
                        });
                        handleProductChange(index, productId);
                      }
                    }}
                    onSearch={setProductSearch}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                      handleBarcodeKeyDown(index, e)
                    }
                    placeholder="Search and select product..."
                    searchPlaceholder="Type product name, barcode, or scan barcode..."
                    error={errors.items?.[index]?.product_id?.message}
                  />

                  <Input
                    label="Quantity *"
                    type="number"
                    min="1"
                    {...register(`items.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                    error={errors.items?.[index]?.quantity?.message}
                  />

                  <Input
                    label="Unit Cost *"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`items.${index}.unit_cost`, {
                      valueAsNumber: true,
                    })}
                    error={errors.items?.[index]?.unit_cost?.message}
                  />
                </div>

                {watchedItems[index]?.product_id &&
                  watchedItems[index]?.quantity &&
                  watchedItems[index]?.unit_cost && (
                    <div className="text-sm text-gray-600">
                      Subtotal:{" "}
                      {formatCurrency(
                        (watchedItems[index].quantity || 0) *
                          (watchedItems[index].unit_cost || 0)
                      )}
                    </div>
                  )}
              </div>
            ))}
          </div>

          {errors.items && (
            <p className="text-sm text-red-600">{errors.items.message}</p>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-200 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Controller
                name="discount_type"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Discount Type"
                    options={[
                      { value: "", label: "No Discount" },
                      { value: "percentage", label: "Percentage (%)" },
                      { value: "amount", label: "Amount" },
                    ]}
                    value={field.value || ""}
                    onChange={(e) => {
                      field.onChange(
                        e.target.value === "" ? undefined : e.target.value
                      );
                      if (e.target.value === "") {
                        setValue("discount_value", undefined);
                      }
                    }}
                    error={errors.discount_type?.message}
                  />
                )}
              />
            </div>
            {discountType && (
              <div>
                <Input
                  label={
                    discountType === "percentage"
                      ? "Discount Percentage (%)"
                      : "Discount Amount"
                  }
                  type="number"
                  step="0.01"
                  min="0"
                  max={discountType === "percentage" ? "100" : undefined}
                  {...register("discount_value", {
                    valueAsNumber: true,
                    validate: (val) => {
                      if (discountType && (!val || val <= 0)) {
                        return "Discount value must be greater than 0";
                      }
                      if (
                        discountType === "percentage" &&
                        val !== undefined &&
                        val > 100
                      ) {
                        return "Percentage cannot exceed 100%";
                      }
                      return true;
                    },
                  })}
                  error={errors.discount_value?.message}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium text-gray-700">
                Subtotal:
              </span>
              <span className="text-base font-medium">
                {formatCurrency(
                  watchedItems.reduce(
                    (sum, item) =>
                      sum + (item.quantity || 0) * (item.unit_cost || 0),
                    0
                  )
                )}
              </span>
            </div>
            {discountType && discountValue && discountValue > 0 && (
              <div className="flex items-center justify-between text-red-600">
                <span className="text-base font-medium">
                  Discount (
                  {discountType === "percentage"
                    ? `${discountValue}%`
                    : formatCurrency(discountValue)}
                  ):
                </span>
                <span className="text-base font-medium">
                  -{formatCurrency(calculateDiscountAmount())}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-gray-200 pt-2">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-lg font-bold text-indigo-600">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
                ? "Update Purchase Order"
                : "Create Purchase Order"}
          </Button>
        </div>
      </form>

      <Modal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        title="Add New Supplier"
      >
        <InlineSupplierForm
          onSuccess={async (supplierId: number) => {
            await refetchSuppliers();
            setValue("supplier_id", supplierId);
            setShowSupplierModal(false);
            toast.success("Supplier created and selected");
          }}
        />
      </Modal>
    </>
  );
}

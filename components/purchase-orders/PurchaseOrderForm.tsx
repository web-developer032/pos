"use client";

import { useState, useRef, useEffect } from "react";
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
import { useGetProductsQuery } from "@/lib/api/productsApi";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useCurrency } from "@/lib/hooks/useCurrency";
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
  const productInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>(
    {}
  );
  const { data: suppliersData, refetch: refetchSuppliers } =
    useGetSuppliersQuery();
  const { data: productsData } = useGetProductsQuery();
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
    },
  });

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
      });
    }
  }, [purchaseOrderData, isEditMode, reset]);

  const { fields, append, prepend, remove } = useFieldArray({
    control,
    name: "items",
  });

  const handleAddItem = () => {
    const newIndex = 0; // Since we're prepending, new item is always at index 0
    prepend({ product_id: 0, quantity: 1, unit_cost: 0 });
    // Focus the product input after a short delay to ensure DOM is updated
    setTimeout(() => {
      const productInput = productInputRefs.current[newIndex];
      if (productInput) {
        productInput.focus();
        productInput.click(); // Also open the dropdown
      }
    }, 100);
  };

  const watchedItems = watch("items");
  const supplierId = watch("supplier_id");

  const calculateTotal = () => {
    return watchedItems.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0),
      0
    );
  };

  const onSubmit = async (data: PurchaseOrderFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isEditMode && purchaseOrderId) {
        await updatePurchaseOrderItems({
          id: purchaseOrderId,
          data: {
            supplier_id: data.supplier_id,
            items: data.items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_cost: item.unit_cost,
            })),
          },
        }).unwrap();
        toast.success("Purchase order updated successfully");
      } else {
        await createPurchaseOrder({
          supplier_id: data.supplier_id,
          items: data.items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
          })),
        }).unwrap();
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

  const handleProductChange = (
    index: number,
    productId: number,
    setValue: (name: string, value: number) => void
  ) => {
    const product = productsData?.products.find((p) => p.id === productId);
    if (product) {
      setValue(`items.${index}.unit_cost`, product.cost_price);
    }
  };

  // Get product options for searchable select
  const getProductOptions = () => {
    return (
      productsData?.products.map((p) => ({
        value: p.id,
        label: `${p.name}${p.barcode ? ` (${p.barcode})` : ""}${p.sku ? ` [${p.sku}]` : ""} - ${formatCurrency(p.cost_price)}`,
      })) || []
    );
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

        <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2 form-scrollbar">
          {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-lg border border-gray-200 p-4 space-y-3"
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
                  className="text-red-600 hover:text-red-700 text-sm"
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
                  ...getProductOptions(),
                ]}
                value={watch(`items.${index}.product_id`) || 0}
                onChange={(val) => {
                  const productId = Number(val);
                  if (productId > 0) {
                    setValue(`items.${index}.product_id`, productId, {
                      shouldValidate: true,
                    });
                    handleProductChange(index, productId, setValue);
                  }
                }}
                placeholder="Search and select product..."
                searchPlaceholder="Type product name, barcode, or SKU..."
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

      <div className="border-t border-gray-200 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-lg font-bold text-indigo-600">
            {formatCurrency(calculateTotal())}
          </span>
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


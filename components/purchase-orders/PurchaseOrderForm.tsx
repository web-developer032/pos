"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreatePurchaseOrderMutation } from "@/lib/api/purchaseOrdersApi";
import { useGetSuppliersQuery } from "@/lib/api/suppliersApi";
import { useGetProductsQuery } from "@/lib/api/productsApi";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Button } from "@/components/ui/Button";
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
  onSuccess?: () => void;
}

export function PurchaseOrderForm({ onSuccess }: PurchaseOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: suppliersData } = useGetSuppliersQuery();
  const { data: productsData } = useGetProductsQuery();
  const [createPurchaseOrder] = useCreatePurchaseOrderMutation();
  const { format: formatCurrency } = useCurrency();

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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

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
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as { data?: { error?: string } };
      toast.error(err.data?.error || "Failed to create purchase order");
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Supplier *"
        options={[
          { value: 0, label: "Select Supplier" },
          ...(suppliersData?.suppliers.map((s) => ({
            value: s.id,
            label: s.name,
          })) || []),
        ]}
        {...register("supplier_id", { valueAsNumber: true })}
        error={errors.supplier_id?.message}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Items *</label>
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ product_id: 0, quantity: 1, unit_cost: 0 })}
            className="text-sm"
          >
            + Add Item
          </Button>
        </div>

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
          {isSubmitting ? "Creating..." : "Create Purchase Order"}
        </Button>
      </div>
    </form>
  );
}


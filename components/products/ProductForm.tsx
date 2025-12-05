"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProductQuery,
  useGetProductsQuery,
} from "@/lib/api/productsApi";
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
} from "@/lib/api/categoriesApi";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useFormSubmission } from "@/lib/hooks/useFormSubmission";
import {
  toFloat,
  toOptionalId,
  validateNonNegative,
  roundPrice,
} from "@/lib/utils/formHelpers";
import toast from "react-hot-toast";
import { ProfitPercentage } from "@/components/common/ProfitPercentage";

// Inline Category Form Component
function InlineCategoryForm({
  onSuccess,
}: {
  onSuccess: (categoryId: number) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { name: "", description: "" },
  });
  const [createCategory] = useCreateCategoryMutation();

  const { handleSubmit: handleFormSubmit, isSubmitting } = useFormSubmission({
    onSubmit: async (data: { name: string; description?: string }) => {
      const result = await createCategory({
        name: data.name,
        description: data.description || undefined,
      }).unwrap();
      return result;
    },
    onSuccess: (result: unknown) => {
      const categoryResult = result as { category: { id: number } };
      onSuccess(categoryResult.category.id);
    },
    successMessage: "Category created successfully",
    errorMessage: "Failed to create category",
  });

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Name *"
        {...register("name", { required: "Name is required" })}
        error={errors.name?.message as string}
      />
      <Input
        label="Description"
        {...register("description")}
        error={errors.description?.message as string}
      />
      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create"}
        </Button>
      </div>
    </form>
  );
}

const productUnitEnum = z.enum([
  "piece",
  "gram",
  "kilogram",
  "liter",
  "milliliter",
]);

const productTypeEnum = z.enum(["simple", "base", "packing", "composite"]);

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  barcode: z.string().optional(),
  additional_barcodes: z.array(z.string()).optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  category_id: z.union([z.number(), z.string(), z.undefined()]).optional(),
  cost_price: z.union([z.number(), z.string()]),
  selling_price: z.union([z.number(), z.string()]).refine(
    (val) => {
      if (val === "" || val === null || val === undefined) {
        return false;
      }
      const num = Number(val);
      return !isNaN(num) && num >= 0;
    },
    { message: "Selling price is required and must be >= 0" }
  ),
  stock_quantity: z.union([z.number(), z.string()]),
  min_stock_level: z.union([z.number(), z.string()]),
  unit: productUnitEnum,
  image_url: z.string().optional(),
  product_type: productTypeEnum.optional(),
  base_product_id: z.union([z.number(), z.string(), z.undefined()]).optional(),
  base_unit_quantity: z.union([z.number(), z.string()]).optional(),
  composite_product_id: z
    .union([z.number(), z.string(), z.undefined()])
    .optional(),
  composite_quantity: z.union([z.number(), z.string()]).optional(),
  is_variable_quantity: z.boolean().optional(),
});

type ProductFormDataRaw = z.infer<typeof productSchema>;

interface ProductFormData {
  name: string;
  barcode?: string;
  additional_barcodes?: string[];
  sku?: string;
  description?: string;
  category_id?: number;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  unit: "piece" | "gram" | "kilogram" | "liter" | "milliliter";
  image_url?: string;
  product_type?: "simple" | "base" | "packing" | "composite";
  base_product_id?: number;
  base_unit_quantity?: number;
  composite_product_id?: number;
  composite_quantity?: number;
  is_variable_quantity?: boolean;
}

interface ProductFormProps {
  productId?: number | null;
  onSuccess?: () => void;
  onProductCreated?: (product: {
    id: number;
    name: string;
    cost_price: number;
  }) => void;
}

export function ProductForm({
  productId,
  onSuccess,
  onProductCreated,
}: ProductFormProps) {
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const { data: productData } = useGetProductQuery(productId!, {
    skip: !productId,
  });
  const { data: categoriesData, refetch: refetchCategories } =
    useGetCategoriesQuery();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  const {
    register,
    handleSubmit: reactHookFormHandleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ProductFormDataRaw>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      barcode: "",
      additional_barcodes: [],
      sku: "",
      description: "",
      category_id: undefined,
      cost_price: "",
      selling_price: "",
      stock_quantity: "",
      min_stock_level: "",
      unit: "piece" as const,
      image_url: "",
      product_type: "simple" as const,
      base_product_id: undefined,
      base_unit_quantity: "",
      composite_product_id: undefined,
      composite_quantity: "",
      is_variable_quantity: false,
    },
  });

  const productType = watch("product_type") || "simple";

  // Fetch base products for packing selection (only when product type is packing)
  const { data: baseProductsData } = useGetProductsQuery(
    { search: undefined, categoryId: undefined },
    { skip: productType !== "packing" }
  );

  // Fetch all products for composite selection (only when product type is composite)
  const { data: allProductsData } = useGetProductsQuery(
    { search: undefined, categoryId: undefined },
    { skip: productType !== "composite" }
  );

  // Filter base products (product_type = 'base')
  const baseProducts =
    baseProductsData?.products.filter((p) => p.product_type === "base") || [];

  // Filter products for composite (simple or base)
  const compositeBaseProducts =
    allProductsData?.products.filter(
      (p) => p.product_type === "simple" || p.product_type === "base"
    ) || [];

  useEffect(() => {
    if (productData?.product) {
      reset({
        name: productData.product.name,
        barcode: productData.product.barcode || "",
        additional_barcodes: productData.product.additional_barcodes || [],
        sku: productData.product.sku || "",
        description: productData.product.description || "",
        category_id: productData.product.category_id || undefined,
        cost_price: productData.product.cost_price.toString(),
        selling_price: productData.product.selling_price.toString(),
        stock_quantity: productData.product.stock_quantity.toString(),
        min_stock_level: productData.product.min_stock_level.toString(),
        unit: (productData.product.unit ||
          "piece") as ProductFormDataRaw["unit"],
        image_url: productData.product.image_url || "",
        product_type: (productData.product.product_type ||
          "simple") as ProductFormDataRaw["product_type"],
        base_product_id: productData.product.base_product_id || undefined,
        base_unit_quantity:
          productData.product.base_unit_quantity?.toString() || "",
        composite_product_id:
          productData.product.composite_product_id || undefined,
        composite_quantity:
          productData.product.composite_quantity?.toString() || "",
        is_variable_quantity: productData.product.is_variable_quantity || false,
      });
    }
  }, [productData, reset]);

  // Clear relationship fields when product type changes
  useEffect(() => {
    if (productType === "simple" || productType === "base") {
      setValue("base_product_id", undefined);
      setValue("base_unit_quantity", "");
      setValue("composite_product_id", undefined);
      setValue("composite_quantity", "");
    }
    if (productType !== "base") {
      setValue("is_variable_quantity", false);
    }
    if (productType !== "packing") {
      setValue("base_product_id", undefined);
      setValue("base_unit_quantity", "");
    }
    if (productType !== "composite") {
      setValue("composite_product_id", undefined);
      setValue("composite_quantity", "");
    }
  }, [productType, setValue]);

  const { handleSubmit: handleFormSubmit, isSubmitting } =
    useFormSubmission<ProductFormDataRaw>({
      onSubmit: async (data) => {
        // Convert and validate number fields using formHelpers
        const costPrice = toFloat(data.cost_price);
        const sellingPrice = toFloat(data.selling_price);
        const stockQuantity = toFloat(data.stock_quantity);
        const minStockLevel = toFloat(data.min_stock_level);

        // Validate required number fields
        const costPriceValidation = validateNonNegative(
          costPrice,
          "Cost price"
        );
        if (!costPriceValidation.valid) {
          throw new Error(costPriceValidation.error);
        }

        const sellingPriceValidation = validateNonNegative(
          sellingPrice,
          "Selling price"
        );
        if (!sellingPriceValidation.valid) {
          throw new Error(sellingPriceValidation.error);
        }

        const stockQuantityValidation = validateNonNegative(
          stockQuantity,
          "Stock quantity"
        );
        if (!stockQuantityValidation.valid) {
          throw new Error(stockQuantityValidation.error);
        }

        const minStockLevelValidation = validateNonNegative(
          minStockLevel,
          "Min stock level"
        );
        if (!minStockLevelValidation.valid) {
          throw new Error(minStockLevelValidation.error);
        }

        // Convert category_id using formHelpers
        const categoryId = toOptionalId(data.category_id);

        const submitData: ProductFormData = {
          name: data.name,
          barcode: data.barcode || undefined,
          additional_barcodes:
            data.additional_barcodes?.filter((b) => b.trim()) || undefined,
          sku: data.sku || undefined,
          description: data.description || undefined,
          category_id: categoryId,
          cost_price: roundPrice(costPrice),
          selling_price: roundPrice(sellingPrice),
          stock_quantity: stockQuantity,
          min_stock_level: minStockLevel,
          unit: data.unit || "piece",
          image_url: data.image_url || undefined,
          product_type: data.product_type || "simple",
          base_product_id: data.base_product_id
            ? toOptionalId(data.base_product_id)
            : undefined,
          base_unit_quantity: data.base_unit_quantity
            ? toFloat(data.base_unit_quantity)
            : undefined,
          composite_product_id: data.composite_product_id
            ? toOptionalId(data.composite_product_id)
            : undefined,
          composite_quantity: data.composite_quantity
            ? toFloat(data.composite_quantity)
            : undefined,
          is_variable_quantity: data.is_variable_quantity || false,
        };

        if (productId) {
          return await updateProduct({
            id: productId,
            data: submitData,
          }).unwrap();
        } else {
          return await createProduct(submitData).unwrap();
        }
      },
      onSuccess: (result: unknown) => {
        // If creating a new product and onProductCreated is provided, pass the product
        if (!productId && onProductCreated && result) {
          const productResult = result as {
            product: { id: number; name: string; cost_price: number };
          };
          onProductCreated(productResult.product);
        }
        onSuccess?.();
      },
      successMessage: productId
        ? "Product updated successfully"
        : "Product created successfully",
      errorMessage: "Failed to save product",
    });

  return (
    <>
      <form
        onSubmit={reactHookFormHandleSubmit((data: ProductFormDataRaw) =>
          handleFormSubmit(data)
        )}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Name *"
            {...register("name")}
            error={errors.name?.message}
          />
          <Input label="SKU" {...register("sku")} error={errors.sku?.message} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Barcode"
            {...register("barcode")}
            error={errors.barcode?.message}
          />
          <Input
            label="Image URL"
            {...register("image_url")}
            error={errors.image_url?.message}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Additional Barcodes
          </label>
          <Controller
            name="additional_barcodes"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                {field.value?.map((barcode, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={barcode}
                      onChange={(e) => {
                        const newBarcodes = [...(field.value || [])];
                        newBarcodes[index] = e.target.value;
                        field.onChange(newBarcodes);
                      }}
                      placeholder="Enter barcode"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const newBarcodes =
                          field.value?.filter((_, i) => i !== index) || [];
                        field.onChange(newBarcodes);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    field.onChange([...(field.value || []), ""]);
                  }}
                >
                  Add Barcode
                </Button>
              </div>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <div>
                  <Select
                    label="Category"
                    options={[
                      { value: "", label: "Select Category" },
                      ...(categoriesData?.categories.map((c) => ({
                        value: c.id.toString(),
                        label: c.name,
                      })) || []),
                    ]}
                    value={field.value?.toString() || ""}
                    onChange={(e) => {
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      );
                    }}
                    error={errors.category_id?.message}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="mt-1 text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + Add New Category
                  </button>
                </div>
              )}
            />
          </div>
        </div>
        <Input
          label="Description"
          {...register("description")}
          error={errors.description?.message}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cost Price *"
            type="number"
            step="0.01"
            {...register("cost_price")}
            error={errors.cost_price?.message}
          />
          <Input
            label="Selling Price *"
            type="number"
            step="0.01"
            required
            {...register("selling_price")}
            error={errors.selling_price?.message}
          />
        </div>
        <ProfitPercentage
          costPrice={watch("cost_price")}
          sellingPrice={watch("selling_price")}
          variant="card"
          showLabel={true}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Stock Quantity *"
            type="number"
            step="any"
            {...register("stock_quantity")}
            error={errors.stock_quantity?.message}
          />
          <Input
            label="Min Stock Level *"
            type="number"
            step="any"
            {...register("min_stock_level")}
            error={errors.min_stock_level?.message}
          />
        </div>
        <div>
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <Select
                label="Measuring Unit *"
                options={[
                  { value: "piece", label: "Piece" },
                  { value: "gram", label: "Gram (g)" },
                  { value: "kilogram", label: "Kilogram (kg)" },
                  { value: "liter", label: "Liter (L)" },
                  { value: "milliliter", label: "Milliliter (mL)" },
                ]}
                value={field.value || "piece"}
                onChange={(e) => field.onChange(e.target.value)}
                error={errors.unit?.message}
              />
            )}
          />
        </div>

        {/* Product Type and Relationship Fields */}
        <div className="mt-4 border-t pt-4">
          <h3 className="mb-4 text-lg font-medium">Product Relationships</h3>

          <div className="mb-4">
            <Controller
              name="product_type"
              control={control}
              render={({ field }) => (
                <Select
                  label="Product Type *"
                  options={[
                    { value: "simple", label: "Simple" },
                    { value: "base", label: "Base" },
                    { value: "packing", label: "Packing" },
                    { value: "composite", label: "Composite" },
                  ]}
                  value={field.value || "simple"}
                  onChange={(e) => field.onChange(e.target.value)}
                  error={errors.product_type?.message}
                />
              )}
            />
          </div>

          {/* Base Product Fields (for packings) */}
          {productType === "packing" && (
            <div className="mb-4 space-y-4 rounded bg-gray-50 p-4">
              <Controller
                name="base_product_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Base Product *"
                    options={[
                      { value: "", label: "Select Base Product" },
                      ...baseProducts.map((p) => ({
                        value: p.id.toString(),
                        label: `${p.name} (${p.barcode || "No barcode"})`,
                      })),
                    ]}
                    value={field.value?.toString() || ""}
                    onChange={(e) => {
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      );
                    }}
                    error={errors.base_product_id?.message}
                  />
                )}
              />
              <Input
                label="Base Unit Quantity *"
                type="number"
                step="0.01"
                {...register("base_unit_quantity")}
                error={errors.base_unit_quantity?.message}
                placeholder="e.g., 0.75 for 750g of 1kg base"
              />
            </div>
          )}

          {/* Composite Product Fields */}
          {productType === "composite" && (
            <div className="mb-4 space-y-4 rounded bg-gray-50 p-4">
              <Controller
                name="composite_product_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Base Product *"
                    options={[
                      { value: "", label: "Select Base Product" },
                      ...compositeBaseProducts.map((p) => ({
                        value: p.id.toString(),
                        label: `${p.name} (${p.barcode || "No barcode"})`,
                      })),
                    ]}
                    value={field.value?.toString() || ""}
                    onChange={(e) => {
                      field.onChange(
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value)
                      );
                    }}
                    error={errors.composite_product_id?.message}
                  />
                )}
              />
              <Input
                label="Composite Quantity *"
                type="number"
                step="0.01"
                {...register("composite_quantity")}
                error={errors.composite_quantity?.message}
                placeholder="e.g., 12 for 12 biscuits per box"
              />
            </div>
          )}

          {/* Variable Quantity Option (for base products) */}
          {productType === "base" && (
            <div className="mb-4">
              <Controller
                name="is_variable_quantity"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={field.value || false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Allow variable quantity sales (e.g., 700g of 1kg sugar)
                    </span>
                  </label>
                )}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : productId ? "Update" : "Create"}
          </Button>
        </div>
      </form>

      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Add New Category"
      >
        <InlineCategoryForm
          onSuccess={async (categoryId: number) => {
            await refetchCategories();
            setValue("category_id", categoryId);
            setShowCategoryModal(false);
            toast.success("Category created and selected");
          }}
        />
      </Modal>
    </>
  );
}

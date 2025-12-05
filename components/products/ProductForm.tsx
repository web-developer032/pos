"use client";

import { useEffect, useState, useMemo } from "react";
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
import { SearchableSelect } from "@/components/ui/SearchableSelect";
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
import { useBarcodeScanner } from "@/lib/hooks/useBarcodeScanner";
import { useDebounce } from "@/lib/hooks/useDebounce";

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
  base_product_id: z.union([z.number(), z.string(), z.undefined()]).optional(),
  quantity_multiplier: z.union([z.number(), z.string()]).optional(),
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
  base_product_id?: number;
  quantity_multiplier?: number;
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
      base_product_id: undefined,
      quantity_multiplier: "",
    },
  });

  const [isCreatingRelatedProduct, setIsCreatingRelatedProduct] =
    useState(false);
  const baseProductId = watch("base_product_id");
  const isRelatedProduct = !!baseProductId || isCreatingRelatedProduct;

  // Search state for base products (when creating related product)
  const [baseProductSearchTerm, setBaseProductSearchTerm] = useState("");
  const debouncedBaseProductSearch = useDebounce(baseProductSearchTerm, 300);

  // Fetch base products (products without base_product_id) for related product selection
  // Use debounced search to trigger API calls
  const { data: baseProductsData } = useGetProductsQuery(
    {
      search: debouncedBaseProductSearch || undefined,
      categoryId: undefined,
      limit: 50, // Limit results for better performance
    },
    { skip: !isRelatedProduct } // Only fetch when creating/editing related product
  );

  // Filter to get only base products (products without base_product_id)
  const baseProducts = useMemo(
    () => baseProductsData?.products.filter((p) => !p.base_product_id) || [],
    [baseProductsData?.products]
  );

  // Barcode scanner for base product selection
  const { isBarcodePattern } = useBarcodeScanner();

  // Handle barcode scan for base product selection
  const handleBaseProductBarcodeScan = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      const currentValue = (e.target as HTMLInputElement).value.trim();
      if (currentValue && isBarcodePattern(currentValue)) {
        e.preventDefault();
        // Find product by barcode
        const foundProduct = baseProducts.find(
          (p) =>
            p.barcode === currentValue ||
            p.additional_barcodes?.includes(currentValue)
        );
        if (foundProduct) {
          setValue("base_product_id", foundProduct.id);
          toast.success(`Selected: ${foundProduct.name}`);
        } else {
          toast.error("Product not found with this barcode");
        }
      }
    }
  };

  // Create searchable options with barcode in label for better search
  const baseProductOptions = [
    { value: "", label: "Select Base Product" },
    ...baseProducts.map((p) => ({
      value: p.id,
      label: `${p.name}${p.barcode ? ` (${p.barcode})` : ""}`,
      searchText: `${p.name} ${p.barcode || ""} ${p.sku || ""}`.toLowerCase(),
    })),
  ];

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
        base_product_id: productData.product.base_product_id || undefined,
        quantity_multiplier:
          productData.product.quantity_multiplier?.toString() || "",
      });
    }
  }, [productData, reset]);

  // Auto-populate SKU from base product when base product is selected
  useEffect(() => {
    if (baseProductId) {
      const baseProduct = baseProducts.find((p) => p.id === baseProductId);
      if (baseProduct?.sku) {
        setValue("sku", baseProduct.sku);
      }
    }
  }, [baseProductId, baseProducts, setValue]);

  // Clear relationship fields when base_product_id is cleared
  useEffect(() => {
    if (!baseProductId) {
      setValue("quantity_multiplier", "");
      setBaseProductSearchTerm("");
    }
  }, [baseProductId, setValue]);

  const { handleSubmit: handleFormSubmit, isSubmitting } =
    useFormSubmission<ProductFormDataRaw>({
      onSubmit: async (data) => {
        // Convert and validate number fields using formHelpers
        const costPrice = toFloat(data.cost_price);
        const sellingPrice = toFloat(data.selling_price);

        // Stock fields are only required for base products
        // Related products use base product stock, so set to 0
        const stockQuantity = isRelatedProduct
          ? 0
          : toFloat(data.stock_quantity);
        const minStockLevel = isRelatedProduct
          ? 0
          : toFloat(data.min_stock_level);

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

        // Only validate stock fields for base products (not related products)
        if (!isRelatedProduct) {
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
          base_product_id: data.base_product_id
            ? toOptionalId(data.base_product_id)
            : undefined,
          quantity_multiplier: data.quantity_multiplier
            ? toFloat(data.quantity_multiplier)
            : undefined,
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
        {/* Product Relationship Fields - Show when creating related product */}
        {isRelatedProduct && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              Related Product Configuration
            </h3>
            <div className="space-y-4">
              <Controller
                name="base_product_id"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    label="Base Product *"
                    options={baseProductOptions}
                    value={field.value || ""}
                    onChange={(value) => {
                      field.onChange(
                        value === "" || value === 0 ? undefined : Number(value)
                      );
                    }}
                    placeholder="Search by name or scan barcode..."
                    searchPlaceholder="Type name or scan barcode..."
                    onKeyDown={handleBaseProductBarcodeScan}
                    onSearch={(term) => setBaseProductSearchTerm(term)}
                    error={errors.base_product_id?.message as string}
                  />
                )}
              />
              <Input
                label="Quantity Multiplier *"
                type="number"
                step="0.01"
                {...register("quantity_multiplier")}
                error={errors.quantity_multiplier?.message}
                placeholder="e.g., 0.7 for 700g of 1kg base, or 10 for 10 units per box"
              />
              <p className="text-xs text-gray-600">
                💡 This product will share stock with the base product. Selling
                this product will reduce the base product&apos;s stock by the
                multiplier amount.
              </p>
            </div>
          </div>
        )}

        {/* Toggle to create related product (only when creating new product) */}
        {!productId && !baseProductId && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isCreatingRelatedProduct}
                onChange={(e) => setIsCreatingRelatedProduct(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Create as related product (links to a base product)
              </span>
            </label>
            <p className="mt-2 text-xs text-gray-600">
              💡 Check this if this product should share stock with another base
              product
            </p>
          </div>
        )}

        {/* Basic Product Information */}
        <div className="mb-4 border-t pt-4">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">
            Basic Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name *"
              {...register("name")}
              error={errors.name?.message}
            />
            {/* Hide SKU for related products - they use base product's SKU */}
            {!isRelatedProduct && (
              <Input
                label="SKU"
                {...register("sku")}
                error={errors.sku?.message}
              />
            )}
          </div>
          <div className="my-2 grid grid-cols-2 gap-4">
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
          <div className="my-2">
            <label className="my-2 block text-sm font-medium text-gray-700">
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

          <Input
            label="Description"
            {...register("description")}
            error={errors.description?.message}
            className="col-span-2 mt-2"
          />
        </div>

        {/* Pricing Information */}
        <div className="mb-4 border-t pt-4">
          <h3 className="mb-4 text-lg font-semibold text-gray-800">Pricing</h3>
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
        </div>

        {/* Stock & Inventory Information - Only for base products */}
        {!isRelatedProduct && (
          <div className="mb-4 border-t pt-4">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              Stock & Inventory
            </h3>
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
              <div className="col-span-2">
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
            </div>
          </div>
        )}

        {/* Unit field for related products (they still need a unit for display) */}
        {isRelatedProduct && (
          <div className="mb-4 border-t pt-4">
            <h3 className="mb-4 text-lg font-semibold text-gray-800">
              Display Settings
            </h3>
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
          </div>
        )}

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

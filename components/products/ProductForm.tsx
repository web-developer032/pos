"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProductQuery,
} from "@/lib/api/productsApi";
import {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
} from "@/lib/api/categoriesApi";
import {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
} from "@/lib/api/suppliersApi";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useFormSubmission } from "@/lib/hooks/useFormSubmission";
import {
  toFloat,
  toInt,
  toOptionalId,
  validateNonNegative,
} from "@/lib/utils/formHelpers";
import toast from "react-hot-toast";

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
    onSuccess: (result: any) => {
      onSuccess(result.category.id);
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

// Inline Supplier Form Component
function InlineSupplierForm({
  onSuccess,
}: {
  onSuccess: (supplierId: number) => void;
}) {
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

  const { handleSubmit: handleFormSubmit, isSubmitting } = useFormSubmission({
    onSubmit: async (data: {
      name: string;
      contact_person?: string;
      email?: string;
      phone?: string;
      address?: string;
    }) => {
      const result = await createSupplier({
        name: data.name,
        contact_person: data.contact_person || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
      }).unwrap();
      return result;
    },
    onSuccess: (result: any) => {
      onSuccess(result.supplier.id);
    },
    successMessage: "Supplier created successfully",
    errorMessage: "Failed to create supplier",
  });

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  category_id: z.union([z.number(), z.string(), z.undefined()]).optional(),
  supplier_id: z.union([z.number(), z.string(), z.undefined()]).optional(),
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
  image_url: z.string().optional(),
});

type ProductFormDataRaw = z.infer<typeof productSchema>;

interface ProductFormData {
  name: string;
  barcode?: string;
  sku?: string;
  description?: string;
  category_id?: number;
  supplier_id?: number;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  min_stock_level: number;
  image_url?: string;
}

interface ProductFormProps {
  productId?: number | null;
  onSuccess?: () => void;
}

export function ProductForm({ productId, onSuccess }: ProductFormProps) {
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const { data: productData } = useGetProductQuery(productId!, {
    skip: !productId,
  });
  const { data: categoriesData, refetch: refetchCategories } =
    useGetCategoriesQuery();
  const { data: suppliersData, refetch: refetchSuppliers } =
    useGetSuppliersQuery();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ProductFormDataRaw>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      barcode: "",
      sku: "",
      description: "",
      category_id: undefined,
      supplier_id: undefined,
      cost_price: "",
      selling_price: "",
      stock_quantity: "",
      min_stock_level: "",
      image_url: "",
    },
  });

  useEffect(() => {
    if (productData?.product) {
      reset({
        name: productData.product.name,
        barcode: productData.product.barcode || "",
        sku: productData.product.sku || "",
        description: productData.product.description || "",
        category_id: productData.product.category_id || undefined,
        supplier_id: productData.product.supplier_id || undefined,
        cost_price: productData.product.cost_price.toString(),
        selling_price: productData.product.selling_price.toString(),
        stock_quantity: productData.product.stock_quantity.toString(),
        min_stock_level: productData.product.min_stock_level.toString(),
        image_url: productData.product.image_url || "",
      });
    }
  }, [productData, reset]);

  const { handleSubmit: handleFormSubmit, isSubmitting } = useFormSubmission({
    onSubmit: async (data: ProductFormDataRaw) => {
      // Convert and validate number fields using formHelpers
      const costPrice = toFloat(data.cost_price);
      const sellingPrice = toFloat(data.selling_price);
      const stockQuantity = toInt(data.stock_quantity);
      const minStockLevel = toInt(data.min_stock_level);

      // Validate required number fields
      const costPriceValidation = validateNonNegative(costPrice, "Cost price");
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

      // Convert category_id and supplier_id using formHelpers
      const categoryId = toOptionalId(data.category_id);
      const supplierId = toOptionalId(data.supplier_id);

      const submitData: ProductFormData = {
        name: data.name,
        barcode: data.barcode || undefined,
        sku: data.sku || undefined,
        description: data.description || undefined,
        category_id: categoryId,
        supplier_id: supplierId,
        cost_price: costPrice,
        selling_price: sellingPrice,
        stock_quantity: stockQuantity,
        min_stock_level: minStockLevel,
        image_url: data.image_url || undefined,
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
    onSuccess: () => {
      onSuccess?.();
    },
    successMessage: productId
      ? "Product updated successfully"
      : "Product created successfully",
    errorMessage: "Failed to save product",
  });

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
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
          <div>
            <Controller
              name="supplier_id"
              control={control}
              render={({ field }) => (
                <div>
                  <Select
                    label="Supplier"
                    options={[
                      { value: "", label: "Select Supplier" },
                      ...(suppliersData?.suppliers.map((s) => ({
                        value: s.id.toString(),
                        label: s.name,
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
            {...register("cost_price")}
            error={errors.cost_price?.message}
          />
          <Input
            label="Selling Price *"
            type="number"
            required
            {...register("selling_price")}
            error={errors.selling_price?.message}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Stock Quantity *"
            type="number"
            {...register("stock_quantity")}
            error={errors.stock_quantity?.message}
          />
          <Input
            label="Min Stock Level *"
            type="number"
            {...register("min_stock_level")}
            error={errors.min_stock_level?.message}
          />
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

"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProductQuery,
} from "@/lib/api/productsApi";
import { useGetCategoriesQuery } from "@/lib/api/categoriesApi";
import { useGetSuppliersQuery } from "@/lib/api/suppliersApi";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  barcode: z.string().optional(),
  sku: z.string().optional(),
  description: z.string().optional(),
  category_id: z.union([z.number(), z.string(), z.undefined()]).optional(),
  supplier_id: z.union([z.number(), z.string(), z.undefined()]).optional(),
  cost_price: z.union([z.number(), z.string()]),
  selling_price: z.union([z.number(), z.string()]),
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
  const { data: productData } = useGetProductQuery(productId!, {
    skip: !productId,
  });
  const { data: categoriesData } = useGetCategoriesQuery();
  const { data: suppliersData } = useGetSuppliersQuery();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  const {
    register,
    handleSubmit,
    control,
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

  const onSubmit = async (data: ProductFormDataRaw) => {
    try {
      // Convert string numbers to actual numbers
      const costPrice = Number(data.cost_price);
      const sellingPrice = Number(data.selling_price);
      const stockQuantity = Number(data.stock_quantity);
      const minStockLevel = Number(data.min_stock_level);

      // Validate required number fields
      if (isNaN(costPrice) || costPrice < 0) {
        toast.error("Cost price is required and must be >= 0");
        return;
      }
      if (isNaN(sellingPrice) || sellingPrice < 0) {
        toast.error("Selling price is required and must be >= 0");
        return;
      }
      if (isNaN(stockQuantity) || stockQuantity < 0) {
        toast.error("Stock quantity is required and must be >= 0");
        return;
      }
      if (isNaN(minStockLevel) || minStockLevel < 0) {
        toast.error("Min stock level is required and must be >= 0");
        return;
      }

      // Convert category_id and supplier_id
      const categoryId =
        data.category_id === "" || data.category_id === undefined
          ? undefined
          : Number(data.category_id);
      const supplierId =
        data.supplier_id === "" || data.supplier_id === undefined
          ? undefined
          : Number(data.supplier_id);

      const submitData: ProductFormData = {
        name: data.name,
        barcode: data.barcode || undefined,
        sku: data.sku || undefined,
        description: data.description || undefined,
        category_id: isNaN(Number(categoryId)) ? undefined : Number(categoryId),
        supplier_id: isNaN(Number(supplierId)) ? undefined : Number(supplierId),
        cost_price: costPrice,
        selling_price: sellingPrice,
        stock_quantity: Math.floor(stockQuantity),
        min_stock_level: Math.floor(minStockLevel),
        image_url: data.image_url || undefined,
      };

      if (productId) {
        await updateProduct({ id: productId, data: submitData }).unwrap();
        toast.success("Product updated successfully");
      } else {
        await createProduct(submitData).unwrap();
        toast.success("Product created successfully");
      }
      onSuccess?.();
    } catch (error: unknown) {
      const err = error as { data?: { error?: string } };
      toast.error(err.data?.error || "Failed to save product");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <Controller
          name="category_id"
          control={control}
          render={({ field }) => (
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
                  e.target.value === "" ? undefined : Number(e.target.value)
                );
              }}
              error={errors.category_id?.message}
            />
          )}
        />
        <Controller
          name="supplier_id"
          control={control}
          render={({ field }) => (
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
                  e.target.value === "" ? undefined : Number(e.target.value)
                );
              }}
              error={errors.supplier_id?.message}
            />
          )}
        />
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
        <Button type="submit">{productId ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
}

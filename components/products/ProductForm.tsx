"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
  category_id: z.number().optional(),
  supplier_id: z.number().optional(),
  cost_price: z.number().min(0, "Cost price must be >= 0"),
  selling_price: z.number().min(0, "Selling price must be >= 0"),
  stock_quantity: z.number().int().min(0, "Stock quantity must be >= 0"),
  min_stock_level: z.number().int().min(0, "Min stock level must be >= 0"),
  image_url: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

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
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
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
        cost_price: productData.product.cost_price,
        selling_price: productData.product.selling_price,
        stock_quantity: productData.product.stock_quantity,
        min_stock_level: productData.product.min_stock_level,
        image_url: productData.product.image_url || "",
      });
    }
  }, [productData, reset]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      const submitData = {
        ...data,
        category_id: data.category_id || undefined,
        supplier_id: data.supplier_id || undefined,
      };
      if (productId) {
        await updateProduct({ id: productId, data: submitData }).unwrap();
        toast.success("Product updated successfully");
      } else {
        await createProduct(submitData).unwrap();
        toast.success("Product created successfully");
      }
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to save product");
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
        <Input
          label="SKU"
          {...register("sku")}
          error={errors.sku?.message}
        />
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
        <Select
          label="Category"
          options={[
            { value: "", label: "Select Category" },
            ...(categoriesData?.categories.map((c) => ({
              value: c.id.toString(),
              label: c.name,
            })) || []),
          ]}
          {...register("category_id", { valueAsNumber: true })}
        />
        <Select
          label="Supplier"
          options={[
            { value: "", label: "Select Supplier" },
            ...(suppliersData?.suppliers.map((s) => ({
              value: s.id.toString(),
              label: s.name,
            })) || []),
          ]}
          {...register("supplier_id", { valueAsNumber: true })}
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
          {...register("cost_price", { valueAsNumber: true })}
          error={errors.cost_price?.message}
        />
        <Input
          label="Selling Price *"
          type="number"
          step="0.01"
          {...register("selling_price", { valueAsNumber: true })}
          error={errors.selling_price?.message}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Stock Quantity *"
          type="number"
          {...register("stock_quantity", { valueAsNumber: true })}
          error={errors.stock_quantity?.message}
        />
        <Input
          label="Min Stock Level *"
          type="number"
          {...register("min_stock_level", { valueAsNumber: true })}
          error={errors.min_stock_level?.message}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="submit">{productId ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
}


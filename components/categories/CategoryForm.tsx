"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useGetCategoryQuery,
} from "@/lib/api/categoriesApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  categoryId?: number | null;
  onSuccess?: () => void;
}

export function CategoryForm({ categoryId, onSuccess }: CategoryFormProps) {
  const { data: categoryData } = useGetCategoryQuery(categoryId!, {
    skip: !categoryId,
  });
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  useEffect(() => {
    if (categoryData?.category) {
      reset({
        name: categoryData.category.name,
        description: categoryData.category.description || "",
      });
    }
  }, [categoryData, reset]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (categoryId) {
        await updateCategory({ id: categoryId, data }).unwrap();
        toast.success("Category updated successfully");
      } else {
        await createCategory(data).unwrap();
        toast.success("Category created successfully");
      }
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to save category");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Name"
        {...register("name")}
        error={errors.name?.message}
      />
      <Input
        label="Description"
        {...register("description")}
        error={errors.description?.message}
      />
      <div className="flex justify-end space-x-2">
        <Button type="submit">{categoryId ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
}


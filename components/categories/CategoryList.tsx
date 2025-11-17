"use client";

import { useState } from "react";
import {
  useGetCategoriesQuery,
  useDeleteCategoryMutation,
  useImportCategoriesMutation,
  CreateCategoryRequest,
} from "@/lib/api/categoriesApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CategoryForm } from "./CategoryForm";
import { ImportExport } from "@/components/common/ImportExport";
import toast from "react-hot-toast";

export function CategoryList() {
  const { data, isLoading, refetch } = useGetCategoriesQuery();
  const [deleteCategory] = useDeleteCategoryMutation();
  const [importCategories] = useImportCategoriesMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        await deleteCategory(id).unwrap();
        toast.success("Category deleted successfully");
        refetch();
      } catch (error: any) {
        toast.error(error.data?.error || "Failed to delete category");
      }
    }
  };

  const handleEdit = (id: number) => {
    setEditingCategory(id);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleImport = async (
    items: any[]
  ): Promise<{ imported: number; errors: string[] }> => {
    try {
      const categories: CreateCategoryRequest[] = items.map((item) => ({
        name: item.name || item.Name || "",
        description: item.description || item.Description || undefined,
      }));

      const result = await importCategories({ categories }).unwrap();
      return result;
    } catch (error: any) {
      throw new Error(error.data?.error || "Failed to import categories");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const exportData = (data?.categories || []).map((c) => ({
    name: c.name,
    description: c.description || "",
  }));

  const exportHeaders = ["name", "description"];

  // Template data with example values
  const templateData = [
    {
      name: "Electronics",
      description: "Electronic products and accessories",
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">All Categories</h2>
        <div className="flex gap-2">
          <ImportExport
            data={exportData}
            headers={exportHeaders}
            filename="categories"
            onImport={handleImport}
            onImportSuccess={refetch}
            templateData={templateData}
          />
          <Button onClick={() => setIsModalOpen(true)}>Add Category</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.categories.map((category) => (
              <tr key={category.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium ">
                  {category.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {category.description || "-"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(category.id)}
                    className="mr-4 text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingCategory ? "Edit Category" : "Add Category"}
      >
        <CategoryForm
          categoryId={editingCategory}
          onSuccess={() => {
            handleClose();
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}

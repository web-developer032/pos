"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CategoryList } from "@/components/categories/CategoryList";

export default function CategoriesPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="mt-2 text-gray-600">Manage product categories</p>
        </div>
        <CategoryList />
      </DashboardLayout>
    </ProtectedRoute>
  );
}


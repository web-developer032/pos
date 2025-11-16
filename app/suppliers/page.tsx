"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SupplierList } from "@/components/suppliers/SupplierList";

export default function SuppliersPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Suppliers</h1>
          <p className="mt-2 text-gray-600">Manage your suppliers</p>
        </div>
        <SupplierList />
      </DashboardLayout>
    </ProtectedRoute>
  );
}


"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InventoryList } from "@/components/inventory/InventoryList";

export default function InventoryPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-2 text-gray-600">Manage stock levels</p>
        </div>
        <InventoryList />
      </DashboardLayout>
    </ProtectedRoute>
  );
}


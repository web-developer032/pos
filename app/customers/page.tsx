"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CustomerList } from "@/components/customers/CustomerList";

export default function CustomersPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="mt-2 text-gray-600">Manage your customers</p>
        </div>
        <CustomerList />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

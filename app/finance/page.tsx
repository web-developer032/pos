"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CapitalList } from "@/components/finance/CapitalList";
import { ExpenseList } from "@/components/finance/ExpenseList";

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<"capital" | "expenses">("capital");

  return (
    <ProtectedRoute allowedRoles={["admin", "manager"]}>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Finance Management</h1>
          <p className="mt-2 text-gray-600">
            Track your capital investments and expenses
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("capital")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === "capital"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Capital/Investment
            </button>
            <button
              onClick={() => setActiveTab("expenses")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === "expenses"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Expenses
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "capital" && <CapitalList />}
        {activeTab === "expenses" && <ExpenseList />}
      </DashboardLayout>
    </ProtectedRoute>
  );
}


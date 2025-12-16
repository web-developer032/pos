"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EmployeeList } from "@/components/finance/EmployeeList";
import { SalaryPaymentList } from "@/components/finance/SalaryPaymentList";

type TabType = "employees" | "salaries";

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("employees");

  const tabs: { key: TabType; label: string }[] = [
    { key: "employees", label: "Employees" },
    { key: "salaries", label: "Salary Payments" },
  ];

  return (
    <ProtectedRoute allowedRoles={["admin", "manager"]}>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="mt-2 text-gray-600">
            Manage employees and track salary payments
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  activeTab === tab.key
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "employees" && <EmployeeList />}
        {activeTab === "salaries" && <SalaryPaymentList />}
      </DashboardLayout>
    </ProtectedRoute>
  );
}


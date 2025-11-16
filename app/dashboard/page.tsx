"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { LowStockAlerts } from "@/components/dashboard/LowStockAlerts";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Overview of your store</p>
        </div>

        <StatsCards />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <SalesChart />
          <TopProducts />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <RecentSales />
          <LowStockAlerts />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}


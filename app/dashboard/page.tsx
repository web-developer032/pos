"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { TopProducts } from "@/components/dashboard/TopProducts";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { LowStockAlerts } from "@/components/dashboard/LowStockAlerts";
import { FinanceSummary } from "@/components/dashboard/FinanceSummary";
import {
  DateRangeSelector,
  type DateRange,
} from "@/components/common/DateRangeSelector";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: "",
    endDate: "",
    type: "week",
  });

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FinanceSummary />

        <div className="mb-6">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>

        <StatsCards dateRange={dateRange} />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SalesChart dateRange={dateRange} />
          <TopProducts />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentSales />
          <LowStockAlerts />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

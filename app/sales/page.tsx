"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetSalesQuery } from "@/lib/api/salesApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { format } from "date-fns";
import Link from "next/link";

export default function SalesPage() {
  const { data, isLoading } = useGetSalesQuery();
  const { format: formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div>Loading...</div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">Sales History</h1>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            View all sales transactions
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                  Sale Number
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                  Customer
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                  Date
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                  Payment Method
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                  Total
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data?.sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="whitespace-nowrap px-3 py-4 text-sm font-medium sm:px-6">
                    {sale.sale_number}
                  </td>
                  <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                    {sale.customer_name || "Walk-in"}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500 sm:px-6">
                    {format(new Date(sale.created_at), "MMM dd, yyyy HH:mm")}
                  </td>
                  <td className="hidden px-3 py-4 text-sm capitalize text-gray-500 sm:table-cell sm:px-6">
                    {sale.payment_method}
                  </td>
                  <td className="px-3 py-4 text-sm font-semibold sm:px-6">
                    {formatCurrency(sale.final_amount)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium sm:px-6">
                    <Link
                      href={`/sales/${sale.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

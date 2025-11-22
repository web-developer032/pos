"use client";

import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetSaleQuery } from "@/lib/api/salesApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import Link from "next/link";

export default function SaleDetailPage() {
  const params = useParams();
  const saleId = parseInt(params.id as string);
  const { data, isLoading, error } = useGetSaleQuery(saleId);
  const { format: formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="text-lg">Loading sale details...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <div className="text-lg text-red-600">Sale not found</div>
            <Link href="/sales">
              <Button variant="outline">Back to Sales</Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const { sale, items } = data;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-4">
            <Link href="/sales">
              <Button variant="outline" className="flex items-center gap-2">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Sales
              </Button>
            </Link>
          </div>

          <h1 className="text-3xl font-bold">Sale Details</h1>
          <p className="mt-2 text-gray-600">Sale Number: {sale.sale_number}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sale Information */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">Sale Information</h2>
              </div>
              <div className="px-6 py-4">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Sale Number
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {sale.sale_number}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date</dt>
                    <dd className="mt-1 text-sm">
                      {format(new Date(sale.created_at), "MMM dd, yyyy HH:mm")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Customer
                    </dt>
                    <dd className="mt-1 text-sm">
                      {sale.customer_name || "Walk-in Customer"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Cashier
                    </dt>
                    <dd className="mt-1 text-sm">{sale.user_name || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Payment Method
                    </dt>
                    <dd className="mt-1 text-sm capitalize">
                      {sale.payment_method}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Payment Status
                    </dt>
                    <dd className="mt-1 text-sm capitalize">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          sale.payment_status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {sale.payment_status}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Sale Items */}
            <div className="mt-6 rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">Items</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Barcode
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Discount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          {item.product_name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {item.barcode || "N/A"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          {item.quantity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-red-600">
                          {item.discount > 0
                            ? formatCurrency(item.discount)
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">Summary</h2>
              </div>
              <div className="px-6 py-4">
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Subtotal</dt>
                    <dd className="text-sm font-medium">
                      {formatCurrency(sale.total_amount)}
                    </dd>
                  </div>
                  {sale.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Discount</dt>
                      <dd className="text-sm font-medium text-red-600">
                        -{formatCurrency(sale.discount_amount)}
                      </dd>
                    </div>
                  )}
                  {sale.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Tax</dt>
                      <dd className="text-sm font-medium">
                        {formatCurrency(sale.tax_amount)}
                      </dd>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <dt className="text-base font-semibold">Total</dt>
                      <dd className="text-base font-bold text-indigo-600">
                        {formatCurrency(sale.final_amount)}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

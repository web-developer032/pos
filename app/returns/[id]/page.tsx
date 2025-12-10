"use client";

import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetReturnQuery } from "@/lib/api/returnsApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils/dateTime";
import Link from "next/link";

export default function ReturnDetailPage() {
  const params = useParams();
  const returnId = parseInt(params.id as string);
  const { data, isLoading, error } = useGetReturnQuery(returnId);
  const { format: formatCurrency } = useCurrency();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="text-lg">Loading return details...</div>
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
            <div className="text-lg text-red-600">Return not found</div>
            <Link href="/sales">
              <Button variant="outline">Back to Sales</Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const { return: returnRecord, items } = data;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-4">
            <Link href={`/sales/${returnRecord.sale_id}`}>
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
                Back to Sale
              </Button>
            </Link>
          </div>

          <h1 className="text-3xl font-bold">Return Details</h1>
          <p className="mt-2 text-gray-600">
            Return Number: {returnRecord.return_number}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Return Information */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">Return Information</h2>
              </div>
              <div className="px-6 py-4">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Return Number
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {returnRecord.return_number}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date</dt>
                    <dd className="mt-1 text-sm">
                      {formatDateTime(returnRecord.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Original Sale
                    </dt>
                    <dd className="mt-1 text-sm">
                      <Link
                        href={`/sales/${returnRecord.sale_id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        {returnRecord.sale_number}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Processed By
                    </dt>
                    <dd className="mt-1 text-sm">
                      {returnRecord.user_name || "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Refund Method
                    </dt>
                    <dd className="mt-1 text-sm capitalize">
                      {returnRecord.refund_method.replace("_", " ")}
                    </dd>
                  </div>
                  {returnRecord.reason && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Reason
                      </dt>
                      <dd className="mt-1 text-sm">{returnRecord.reason}</dd>
                    </div>
                  )}
                  {returnRecord.notes && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">
                        Notes
                      </dt>
                      <dd className="mt-1 text-sm">{returnRecord.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Returned Items */}
            <div className="mt-6 rounded-lg bg-white shadow">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">Returned Items</h2>
                <span className="text-sm text-gray-500">
                  Total:{" "}
                  <span className="font-semibold text-gray-700">
                    {items.length}
                  </span>{" "}
                  items
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Barcode
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Quantity Returned
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Refund Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-gray-500">
                          {index + 1}
                        </td>
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
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-red-600">
                          {formatCurrency(item.refund_amount)}
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
                    <dt className="text-sm text-gray-600">Total Items</dt>
                    <dd className="text-sm font-medium">{items.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Total Quantity</dt>
                    <dd className="text-sm font-medium">
                      {items.reduce((sum, item) => sum + item.quantity, 0)}
                    </dd>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <dt className="text-base font-semibold">
                        Total Refund Amount
                      </dt>
                      <dd className="text-base font-bold text-red-600">
                        {formatCurrency(returnRecord.refund_amount)}
                      </dd>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg bg-red-50 p-3">
                    <p className="text-xs text-red-800">
                      <strong>Refund Method:</strong>{" "}
                      {returnRecord.refund_method
                        .replace("_", " ")
                        .split(" ")
                        .map(
                          (word) =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </p>
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


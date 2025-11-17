"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetPurchaseOrdersQuery,
  useUpdatePurchaseOrderMutation,
} from "@/lib/api/purchaseOrdersApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function PurchaseOrdersPage() {
  const { data, isLoading, refetch } = useGetPurchaseOrdersQuery();
  const [updatePO] = useUpdatePurchaseOrderMutation();
  const { format: formatCurrency } = useCurrency();

  const handleStatusChange = async (
    id: number,
    status: "pending" | "completed" | "cancelled"
  ) => {
    try {
      await updatePO({ id, status }).unwrap();
      toast.success("Purchase order updated");
      refetch();
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to update");
    }
  };

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
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data?.purchase_orders.map((po) => (
                <tr key={po.id}>
                  <td className="px-6 py-4 text-sm font-medium">
                    {po.po_number}
                  </td>
                  <td className="px-6 py-4 text-sm">{po.supplier_name}</td>
                  <td className="px-6 py-4 text-sm">
                    {format(new Date(po.created_at), "MMM dd, yyyy")}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {formatCurrency(po.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        po.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : po.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    {po.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(po.id, "completed")}
                          className="mr-4 text-green-600 hover:text-green-900"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleStatusChange(po.id, "cancelled")}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      </>
                    )}
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

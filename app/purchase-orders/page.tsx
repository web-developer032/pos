"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetPurchaseOrdersQuery,
  useUpdatePurchaseOrderMutation,
  useDeleteAllPurchaseOrdersMutation,
} from "@/lib/api/purchaseOrdersApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPOId, setEditingPOId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 500);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, refetch } = useGetPurchaseOrdersQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
  });
  const [updatePO] = useUpdatePurchaseOrderMutation();
  const [deleteAllPOs] = useDeleteAllPurchaseOrdersMutation();
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { format: formatCurrency } = useCurrency();

  const handleStatusChange = async (
    id: number,
    status: "pending" | "completed" | "cancelled"
  ) => {
    if (updatingId === id) return; // Prevent double click
    setUpdatingId(id);
    try {
      await updatePO({ id, status }).unwrap();
      toast.success("Purchase order updated");
      refetch();
    } catch (error: unknown) {
      const err = error as { data?: { error?: string } };
      toast.error(err.data?.error || "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL purchase orders? This action cannot be undone!"
      )
    ) {
      return;
    }
    setIsDeletingAll(true);
    try {
      await deleteAllPOs().unwrap();
      toast.success("All purchase orders deleted successfully");
      refetch();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to delete all purchase orders";
      toast.error(errorMessage);
    } finally {
      setIsDeletingAll(false);
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
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              + Create Purchase Order
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteAll}
              disabled={
                isDeletingAll || (data?.purchase_orders.length || 0) === 0
              }
              className="text-red-600 hover:text-red-700"
            >
              {isDeletingAll ? "Deleting..." : "Delete All"}
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <Input
            type="text"
            placeholder="Search by PO number, supplier, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
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
                          onClick={() => setEditingPOId(po.id)}
                          className="mr-4 text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleStatusChange(po.id, "completed")}
                          disabled={updatingId === po.id}
                          className="mr-4 text-green-600 hover:text-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingId === po.id ? "Updating..." : "Complete"}
                        </button>
                        <button
                          onClick={() => handleStatusChange(po.id, "cancelled")}
                          disabled={updatingId === po.id}
                          className="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingId === po.id ? "Updating..." : "Cancel"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.pagination && (
          <div className="mt-4">
            <Pagination
              currentPage={data.pagination.page}
              totalPages={data.pagination.totalPages}
              totalItems={data.pagination.total}
              itemsPerPage={data.pagination.limit}
              onPageChange={(newPage) => {
                setPage(newPage);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onItemsPerPageChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        )}

        <Modal
          isOpen={isModalOpen || editingPOId !== null}
          onClose={() => {
            setIsModalOpen(false);
            setEditingPOId(null);
          }}
          title={editingPOId ? "Edit Purchase Order" : "Create Purchase Order"}
          size="lg"
        >
          <PurchaseOrderForm
            purchaseOrderId={editingPOId || undefined}
            onSuccess={() => {
              setIsModalOpen(false);
              setEditingPOId(null);
              refetch();
            }}
          />
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

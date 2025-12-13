"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetPurchaseOrdersQuery,
  useUpdatePurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
  useDeleteAllPurchaseOrdersMutation,
} from "@/lib/api/purchaseOrdersApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function PurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPOId, setEditingPOId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 500);

  // Reset to page 1 when search or status filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const { data, isLoading, refetch } = useGetPurchaseOrdersQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  });
  const [updatePO] = useUpdatePurchaseOrderMutation();
  const [deletePO] = useDeletePurchaseOrderMutation();
  const [deleteAllPOs] = useDeleteAllPurchaseOrdersMutation();
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  const handleDelete = async (id: number, poNumber: string) => {
    if (
      !confirm(
        `Are you sure you want to delete purchase order ${poNumber}? This action cannot be undone!`
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await deletePO(id).unwrap();
      toast.success("Purchase order deleted successfully");
      refetch();
    } catch (error: unknown) {
      const err = error as { data?: { error?: string } };
      toast.error(err.data?.error || "Failed to delete purchase order");
    } finally {
      setDeletingId(null);
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

        {/* Summary Cards */}
        {data?.summary && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm font-medium text-gray-500">Grand Total</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formatCurrency(data.summary.grand_total)}
              </p>
              <p className="mt-1 text-xs text-gray-400">All purchase orders</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">
                {formatCurrency(data.summary.total_pending)}
              </p>
              <p className="mt-1 text-xs text-gray-400">Awaiting completion</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {formatCurrency(data.summary.total_completed)}
              </p>
              <p className="mt-1 text-xs text-gray-400">Confirmed purchases</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm font-medium text-gray-500">Amount Paid</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">
                {formatCurrency(data.summary.total_paid)}
              </p>
              <p className="mt-1 text-xs text-gray-400">Payments made</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm font-medium text-gray-500">Outstanding</p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  data.summary.outstanding > 0
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {formatCurrency(Math.max(0, data.summary.outstanding))}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {data.summary.outstanding > 0 ? "Still owed" : "All paid"}
              </p>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="text"
            placeholder="Search by PO number, supplier, or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md flex-1"
          />
          <Select
            options={[
              { value: "", label: "All Statuses" },
              { value: "pending", label: "Pending" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
            <span className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {data?.purchase_orders.length || 0}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700">
                {data?.pagination?.total || 0}
              </span>{" "}
              purchase orders
            </span>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">
                  #
                </th>
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
              {data?.purchase_orders.map((po, index) => (
                <tr key={po.id}>
                  <td className="px-4 py-4 text-center text-sm text-gray-500">
                    {(page - 1) * limit + index + 1}
                  </td>
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
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/purchase-orders/${po.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </Link>
                      {po.status === "pending" && (
                        <>
                          <button
                            onClick={() => setEditingPOId(po.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(po.id, "completed")
                            }
                            disabled={updatingId === po.id}
                            className="text-green-600 hover:text-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingId === po.id ? "Updating..." : "Complete"}
                          </button>
                          <button
                            onClick={() =>
                              handleStatusChange(po.id, "cancelled")
                            }
                            disabled={updatingId === po.id}
                            className="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {updatingId === po.id ? "Updating..." : "Cancel"}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(po.id, po.po_number)}
                        disabled={deletingId === po.id}
                        className="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Delete purchase order"
                      >
                        {deletingId === po.id ? (
                          "Deleting..."
                        ) : (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
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

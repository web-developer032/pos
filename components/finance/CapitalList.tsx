"use client";

import { useState } from "react";
import {
  useGetCapitalQuery,
  useDeleteCapitalMutation,
  Capital,
} from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CapitalForm } from "./CapitalForm";
import { formatDateTime } from "@/lib/utils/dateTime";
import toast from "react-hot-toast";

export function CapitalList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useGetCapitalQuery();
  const [deleteCapital] = useDeleteCapitalMutation();
  const { format: formatCurrency } = useCurrency();

  const handleEdit = (capital: Capital) => {
    setEditingId(capital.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (deletingId === id) return;
    if (confirm("Are you sure you want to delete this capital record?")) {
      setDeletingId(id);
      try {
        await deleteCapital(id).unwrap();
        toast.success("Capital record deleted successfully");
        refetch();
      } catch (error) {
        const errorMessage =
          (error as { data?: { error?: string } })?.data?.error ||
          "Failed to delete capital record";
        toast.error(errorMessage);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  if (isLoading) {
    return <div className="text-center">Loading...</div>;
  }

  const { capital, summary } = data || { capital: [], summary: null };

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">
              Total Investments
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_investments)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">
              Total Withdrawals
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              {formatCurrency(summary.total_withdrawals)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">
              Net Capital
            </div>
            <div
              className={`mt-2 text-2xl font-bold ${
                summary.net_capital >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(summary.net_capital)}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setIsModalOpen(true)}>+ Add Capital Record</Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                User
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {capital.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No capital records found
                </td>
              </tr>
            ) : (
              capital.map((record) => (
                <tr key={record.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDateTime(record.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        record.transaction_type === "investment"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {record.transaction_type}
                    </span>
                  </td>
                  <td
                    className={`whitespace-nowrap px-6 py-4 text-sm font-semibold ${
                      record.transaction_type === "investment"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {record.transaction_type === "investment" ? "+" : "-"}
                    {formatCurrency(record.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {record.description || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {record.user_name || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        disabled={deletingId === record.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === record.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Capital Record" : "Add Capital Record"}
        size="md"
      >
        <CapitalForm
          capitalId={editingId || undefined}
          onSuccess={() => {
            closeModal();
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}


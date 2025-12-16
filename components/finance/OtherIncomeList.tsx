"use client";

import { useState } from "react";
import {
  useGetOtherIncomeQuery,
  useDeleteOtherIncomeMutation,
  OtherIncome,
} from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { OtherIncomeForm } from "./OtherIncomeForm";
import { formatDateTime } from "@/lib/utils/dateTime";
import toast from "react-hot-toast";

export function OtherIncomeList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useGetOtherIncomeQuery();
  const [deleteOtherIncome] = useDeleteOtherIncomeMutation();
  const { format: formatCurrency } = useCurrency();

  const handleEdit = (income: OtherIncome) => {
    setEditingId(income.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (deletingId === id) return;
    if (confirm("Are you sure you want to delete this income record?")) {
      setDeletingId(id);
      try {
        await deleteOtherIncome(id).unwrap();
        toast.success("Income deleted successfully");
        refetch();
      } catch (error) {
        const errorMessage =
          (error as { data?: { error?: string } })?.data?.error ||
          "Failed to delete income";
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

  const { income, summary } = data || { income: [], summary: null };

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div className="mb-6">
          <div className="mb-4 rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">
              Total Other Income
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_income)}
            </div>
          </div>
          {summary.by_category && summary.by_category.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 text-sm font-medium text-gray-500">
                Income by Category
              </div>
              <div className="space-y-2">
                {summary.by_category.map((cat: { category: string; category_total: number }) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-600">{cat.category}</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(cat.category_total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          + Add Other Income
        </Button>
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
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Payment Method
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
            {income.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No other income records found
                </td>
              </tr>
            ) : (
              income.map((item) => (
                <tr key={item.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDateTime(item.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {item.category}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-green-600">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.description || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-500">
                    {item.payment_method.replace("_", " ")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {item.user_name || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === item.id ? "Deleting..." : "Delete"}
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
        title={editingId ? "Edit Income" : "Add Other Income"}
        size="md"
      >
        <OtherIncomeForm
          incomeId={editingId || undefined}
          onSuccess={() => {
            closeModal();
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}


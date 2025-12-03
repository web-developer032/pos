"use client";

import { useState } from "react";
import {
  useGetExpensesQuery,
  useDeleteExpenseMutation,
  Expense,
} from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ExpenseForm } from "./ExpenseForm";
import { formatDateTime } from "@/lib/utils/dateTime";
import toast from "react-hot-toast";

export function ExpenseList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useGetExpensesQuery();
  const [deleteExpense] = useDeleteExpenseMutation();
  const { format: formatCurrency } = useCurrency();

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (deletingId === id) return;
    if (confirm("Are you sure you want to delete this expense?")) {
      setDeletingId(id);
      try {
        await deleteExpense(id).unwrap();
        toast.success("Expense deleted successfully");
        refetch();
      } catch (error) {
        const errorMessage =
          (error as { data?: { error?: string } })?.data?.error ||
          "Failed to delete expense";
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

  const { expenses, summary } = data || { expenses: [], summary: null };

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div className="mb-6">
          <div className="mb-4 rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">
              Total Expenses
            </div>
            <div className="mt-2 text-2xl font-bold text-red-600">
              {formatCurrency(summary.total_expenses)}
            </div>
          </div>
          {summary.by_category && summary.by_category.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 text-sm font-medium text-gray-500">
                Expenses by Category
              </div>
              <div className="space-y-2">
                {summary.by_category.map((cat: any) => (
                  <div
                    key={cat.category}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-600">{cat.category}</span>
                    <span className="font-semibold text-gray-900">
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
        <Button onClick={() => setIsModalOpen(true)}>+ Add Expense</Button>
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
            {expenses.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDateTime(expense.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {expense.category}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-red-600">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {expense.description || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-500">
                    {expense.payment_method.replace("_", " ")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {expense.user_name || "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === expense.id ? "Deleting..." : "Delete"}
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
        title={editingId ? "Edit Expense" : "Add Expense"}
        size="md"
      >
        <ExpenseForm
          expenseId={editingId || undefined}
          onSuccess={() => {
            closeModal();
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}


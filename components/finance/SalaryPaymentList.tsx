"use client";

import { useState, useEffect } from "react";
import {
  useGetSalaryPaymentsQuery,
  useDeleteSalaryPaymentMutation,
  useGetEmployeesQuery,
  SalaryPayment,
} from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SalaryPaymentForm } from "./SalaryPaymentForm";
import { formatDateTime } from "@/lib/utils/dateTime";
import {
  DateRangeSelector,
  DateRange,
} from "@/components/common/DateRangeSelector";
import { Pagination } from "@/components/ui/Pagination";
import toast from "react-hot-toast";

export function SalaryPaymentList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: "",
    endDate: "",
    type: "all",
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [employeeFilter, dateRange]);

  const { data: employeesData } = useGetEmployeesQuery();
  const { data, isLoading, refetch } = useGetSalaryPaymentsQuery({
    employeeId: employeeFilter,
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
    page,
    limit: 20,
  });
  const [deletePayment] = useDeleteSalaryPaymentMutation();
  const { format: formatCurrency } = useCurrency();

  const handleEdit = (payment: SalaryPayment) => {
    setEditingId(payment.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (deletingId === id) return;
    if (confirm("Are you sure you want to delete this payment record?")) {
      setDeletingId(id);
      try {
        await deletePayment(id).unwrap();
        toast.success("Payment deleted successfully");
        refetch();
      } catch (error) {
        const errorMessage =
          (error as { data?: { error?: string } })?.data?.error ||
          "Failed to delete payment";
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

  const { payments, summary, pagination } = data || {
    payments: [],
    summary: null,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
  };

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case "salary":
        return "bg-green-100 text-green-800";
      case "bonus":
        return "bg-blue-100 text-blue-800";
      case "advance":
        return "bg-yellow-100 text-yellow-800";
      case "deduction":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm font-medium text-gray-500">
              Total Salary
            </div>
            <div className="mt-1 text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_salary || 0)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm font-medium text-gray-500">Bonuses</div>
            <div className="mt-1 text-2xl font-bold text-blue-600">
              {formatCurrency(summary.total_bonus || 0)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm font-medium text-gray-500">Advances</div>
            <div className="mt-1 text-2xl font-bold text-yellow-600">
              {formatCurrency(summary.total_advance || 0)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm font-medium text-gray-500">Deductions</div>
            <div className="mt-1 text-2xl font-bold text-red-600">
              {formatCurrency(summary.total_deductions || 0)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm font-medium text-gray-500">Net Paid</div>
            <div className="mt-1 text-2xl font-bold">
              {formatCurrency(summary.net_paid || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Employee
              </label>
              <select
                value={employeeFilter || ""}
                onChange={(e) =>
                  setEmployeeFilter(
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All Employees</option>
                {employeesData?.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <DateRangeSelector value={dateRange} onChange={setDateRange} />
          </div>
          <Button onClick={() => setIsModalOpen(true)}>+ Record Payment</Button>
        </div>
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
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Method
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {payments.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No salary payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDateTime(payment.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.employee_name}
                    </div>
                    {payment.days_worked && (
                      <div className="text-xs text-gray-500">
                        {payment.days_worked} days
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${getPaymentTypeColor(payment.payment_type)}`}
                    >
                      {payment.payment_type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {payment.period}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold">
                    <span
                      className={
                        payment.payment_type === "deduction"
                          ? "text-red-600"
                          : "text-green-600"
                      }
                    >
                      {payment.payment_type === "deduction" ? "-" : "+"}
                      {formatCurrency(payment.amount)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-500">
                    {payment.payment_method.replace("_", " ")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(payment)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        disabled={deletingId === payment.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === payment.id ? "..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
          />
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Payment" : "Record Salary Payment"}
        size="md"
      >
        <SalaryPaymentForm
          paymentId={editingId || undefined}
          onSuccess={() => {
            closeModal();
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}

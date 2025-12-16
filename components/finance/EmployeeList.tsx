"use client";

import { useState } from "react";
import {
  useGetEmployeesQuery,
  useDeleteEmployeeMutation,
  Employee,
} from "@/lib/api/financeApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmployeeForm } from "./EmployeeForm";
import { formatDateOnly } from "@/lib/utils/dateTime";
import toast from "react-hot-toast";

export function EmployeeList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, refetch } = useGetEmployeesQuery({
    status: statusFilter || undefined,
    search: searchTerm || undefined,
  });
  const [deleteEmployee] = useDeleteEmployeeMutation();
  const { format: formatCurrency } = useCurrency();

  const handleEdit = (employee: Employee) => {
    setEditingId(employee.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (deletingId === id) return;
    if (confirm("Are you sure you want to delete/deactivate this employee?")) {
      setDeletingId(id);
      try {
        await deleteEmployee(id).unwrap();
        toast.success("Employee removed successfully");
        refetch();
      } catch (error) {
        const errorMessage =
          (error as { data?: { error?: string } })?.data?.error ||
          "Failed to delete employee";
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

  const { employees, summary } = data || { employees: [], summary: null };

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm font-medium text-gray-500">
              Total Employees
            </div>
            <div className="mt-1 text-2xl font-bold">
              {summary.total_employees}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm font-medium text-gray-500">Active</div>
            <div className="mt-1 text-2xl font-bold text-green-600">
              {summary.active_employees}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm font-medium text-gray-500">
              Monthly Payroll
            </div>
            <div className="mt-1 text-2xl font-bold text-blue-600">
              {formatCurrency(summary.monthly_salary_total || 0)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-4 shadow">
            <div className="text-sm font-medium text-gray-500">
              Daily Rates Total
            </div>
            <div className="mt-1 text-2xl font-bold text-purple-600">
              {formatCurrency(summary.daily_rate_total || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search by name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>+ Add Employee</Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Salary/Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Total Paid
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Join Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {employees.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No employees found
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {employee.name}
                    </div>
                    {employee.phone && (
                      <div className="text-xs text-gray-500">
                        {employee.phone}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        employee.salary_type === "monthly"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {employee.salary_type === "monthly" ? "Monthly" : "Daily"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold">
                    {formatCurrency(employee.base_salary)}
                    {employee.salary_type === "daily" && (
                      <span className="text-xs text-gray-500">/day</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-green-600">
                    {formatCurrency(employee.total_paid || 0)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {employee.join_date
                      ? formatDateOnly(employee.join_date)
                      : "-"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        employee.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {employee.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        disabled={deletingId === employee.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === employee.id ? "..." : "Delete"}
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
        title={editingId ? "Edit Employee" : "Add Employee"}
        size="md"
      >
        <EmployeeForm
          employeeId={editingId || undefined}
          onSuccess={() => {
            closeModal();
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}

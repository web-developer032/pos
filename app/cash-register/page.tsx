"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetCurrentSessionQuery,
  useGetDaySummaryQuery,
  useGetSessionHistoryQuery,
} from "@/lib/api/cashRegisterApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { OpenDayModal } from "@/components/cash-register/OpenDayModal";
import { CloseDayModal } from "@/components/cash-register/CloseDayModal";
import { format } from "date-fns";

// Reusable loading spinner
function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className={`${sizeClass} animate-spin rounded-full border-b-2 border-indigo-600`}
      />
    </div>
  );
}

// Summary card component
function SummaryCard({
  label,
  value,
  subLabel,
  colorClass = "text-gray-900",
}: {
  label: string;
  value: string;
  subLabel: string;
  colorClass?: string;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="text-xs text-gray-400">{subLabel}</p>
    </div>
  );
}

export default function CashRegisterPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const { data: currentSession, isLoading: isLoadingSession } =
    useGetCurrentSessionQuery();

  const isOpen = currentSession?.isOpen ?? false;
  const session = currentSession?.session;

  const { data: summary } = useGetDaySummaryQuery(undefined, {
    skip: !isOpen,
  });

  const { data: history, isLoading: isLoadingHistory } =
    useGetSessionHistoryQuery({ page, limit });

  const { format: formatCurrency } = useCurrency();

  if (isLoadingSession) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <LoadingSpinner />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Cash Register</h1>
          <p className="mt-2 text-gray-600">
            Manage your daily cash drawer operations
          </p>
        </div>

        {/* Current Status Card */}
        <div
          className={`mb-6 rounded-xl border-2 p-6 ${
            isOpen
              ? "border-green-200 bg-green-50"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className={`h-4 w-4 rounded-full ${
                    isOpen ? "animate-pulse bg-green-500" : "bg-gray-400"
                  }`}
                />
                <h2 className="text-xl font-semibold">
                  {isOpen ? "Day is Open" : "Day is Closed"}
                </h2>
              </div>
              {isOpen && session && (
                <div className="mt-2 text-sm text-gray-600">
                  <p>
                    Opened by{" "}
                    <span className="font-medium">{session.user_name}</span> at{" "}
                    {format(new Date(session.opened_at), "MMM dd, yyyy h:mm a")}
                  </p>
                  <p>
                    Opening Balance:{" "}
                    <span className="font-semibold text-indigo-600">
                      {formatCurrency(session.opening_balance)}
                    </span>
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {isOpen ? (
                <Button
                  onClick={() => setIsCloseModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Close Day
                </Button>
              ) : (
                <Button onClick={() => setIsOpenModalOpen(true)}>
                  Open Day
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Current Day Summary */}
        {isOpen && summary && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              label="Sales Today"
              value={formatCurrency(summary.sales.total.total_amount)}
              subLabel={`${summary.sales.total.transaction_count} transactions`}
              colorClass="text-green-600"
            />
            <SummaryCard
              label="Returns Today"
              value={formatCurrency(summary.returns.total.total_refund)}
              subLabel={`${summary.returns.total.return_count} returns`}
              colorClass="text-orange-600"
            />
            <SummaryCard
              label="Expenses Today"
              value={formatCurrency(summary.expenses.total.total_amount)}
              subLabel={`${summary.expenses.total.expense_count} expenses`}
              colorClass="text-red-600"
            />
            <SummaryCard
              label="Expected Cash"
              value={formatCurrency(summary.cash_summary.expected_balance)}
              subLabel="Based on transactions"
              colorClass="text-indigo-600"
            />
          </div>
        )}

        {/* Sales by Payment Method */}
        {isOpen && summary && summary.sales.by_method.length > 0 && (
          <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <h3 className="mb-4 font-semibold text-gray-800">
              Sales by Payment Method
            </h3>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {summary.sales.by_method.map((method) => (
                <div
                  key={method.payment_method}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <p className="text-sm capitalize text-gray-500">
                    {method.payment_method}
                  </p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(method.total_amount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {method.transaction_count} transactions
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session History */}
        <div className="rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="font-semibold text-gray-800">Session History</h3>
            {history?.pagination && (
              <span className="text-sm text-gray-500">
                {history.pagination.total} total sessions
              </span>
            )}
          </div>

          {isLoadingHistory ? (
            <LoadingSpinner size="sm" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {[
                        "#",
                        "Date",
                        "User",
                        "Opening",
                        "Expected",
                        "Closing",
                        "Variance",
                        "Status",
                      ].map((header, idx) => (
                        <th
                          key={header}
                          className={`px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 ${
                            idx >= 3 && idx <= 6 ? "text-right" : "text-left"
                          }`}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {history?.sessions.map((s, index) => (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {(page - 1) * limit + index + 1}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {format(new Date(s.opened_at), "MMM dd, yyyy")}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {s.user_name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          {formatCurrency(s.opening_balance)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          {s.expected_balance !== null
                            ? formatCurrency(s.expected_balance)
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          {s.closing_balance !== null
                            ? formatCurrency(s.closing_balance)
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          {s.variance !== null ? (
                            <span
                              className={`font-medium ${
                                Math.abs(s.variance) < 0.01
                                  ? "text-green-600"
                                  : s.variance > 0
                                    ? "text-blue-600"
                                    : "text-red-600"
                              }`}
                            >
                              {s.variance >= 0 ? "+" : ""}
                              {formatCurrency(s.variance)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              s.status === "open"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!history?.sessions || history.sessions.length === 0) && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          No sessions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {history?.pagination && history.pagination.totalPages > 1 && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <Pagination
                    currentPage={history.pagination.page}
                    totalPages={history.pagination.totalPages}
                    totalItems={history.pagination.total}
                    itemsPerPage={history.pagination.limit}
                    onPageChange={setPage}
                    onItemsPerPageChange={(newLimit) => {
                      setLimit(newLimit);
                      setPage(1);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Modals - No onSuccess needed, RTK Query invalidates tags automatically */}
        <OpenDayModal
          isOpen={isOpenModalOpen}
          onClose={() => setIsOpenModalOpen(false)}
        />
        <CloseDayModal
          isOpen={isCloseModalOpen}
          onClose={() => setIsCloseModalOpen(false)}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

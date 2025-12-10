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

export default function CashRegisterPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const {
    data: currentSession,
    isLoading: isLoadingSession,
    refetch: refetchSession,
  } = useGetCurrentSessionQuery();
  const { data: summary, refetch: refetchSummary } = useGetDaySummaryQuery(
    undefined,
    { skip: !currentSession?.isOpen }
  );
  const {
    data: history,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useGetSessionHistoryQuery({ page, limit });

  const { format: formatCurrency } = useCurrency();

  const handleSuccess = () => {
    refetchSession();
    refetchSummary();
    refetchHistory();
  };

  if (isLoadingSession) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const isOpen = currentSession?.isOpen || false;
  const session = currentSession?.session;

  return (
    <ProtectedRoute>
      <DashboardLayout>
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
                    isOpen ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  }`}
                ></div>
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
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Sales Today</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.sales.total.total_amount)}
              </p>
              <p className="text-xs text-gray-400">
                {summary.sales.total.transaction_count} transactions
              </p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Returns Today</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary.returns.total.total_refund)}
              </p>
              <p className="text-xs text-gray-400">
                {summary.returns.total.return_count} returns
              </p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Expenses Today</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.expenses.total.total_amount)}
              </p>
              <p className="text-xs text-gray-400">
                {summary.expenses.total.expense_count} expenses
              </p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Expected Cash</p>
              <p className="text-2xl font-bold text-indigo-600">
                {formatCurrency(summary.cash_summary.expected_balance)}
              </p>
              <p className="text-xs text-gray-400">
                Based on transactions
              </p>
            </div>
          </div>
        )}

        {/* Sales by Payment Method (if open) */}
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
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="font-semibold text-gray-800">Session History</h3>
          </div>
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        User
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Opening
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Expected
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Closing
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Variance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
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

        {/* Modals */}
        <OpenDayModal
          isOpen={isOpenModalOpen}
          onClose={() => setIsOpenModalOpen(false)}
          onSuccess={handleSuccess}
        />
        <CloseDayModal
          isOpen={isCloseModalOpen}
          onClose={() => setIsCloseModalOpen(false)}
          onSuccess={handleSuccess}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}


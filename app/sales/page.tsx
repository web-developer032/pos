"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetSalesQuery,
  useDeleteSaleMutation,
  useDeleteAllSalesMutation,
} from "@/lib/api/salesApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils/dateTime";
import {
  DateRangeSelector,
  type DateRange,
} from "@/components/common/DateRangeSelector";
import { AllTimeSummaryCards } from "@/components/common/AllTimeSummaryCards";
import { PeriodStatsCards } from "@/components/common/PeriodStatsCards";
import Link from "next/link";
import toast from "react-hot-toast";

export default function SalesPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: "",
    endDate: "",
    type: "month",
  });

  const { data, isLoading, refetch } = useGetSalesQuery({
    page,
    limit,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    search: debouncedSearch || undefined,
  });

  const [deleteSale] = useDeleteSaleMutation();
  const [deleteAllSales] = useDeleteAllSalesMutation();
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { format: formatCurrency } = useCurrency();

  const handleDelete = async (saleId: number, saleNumber: string) => {
    if (
      !confirm(
        `Are you sure you want to delete sale ${saleNumber}? This action cannot be undone and will restore inventory.`
      )
    ) {
      return;
    }
    setDeletingId(saleId);
    try {
      await deleteSale(saleId).unwrap();
      toast.success("Sale deleted successfully");
      refetch();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to delete sale";
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL sales? This action cannot be undone!"
      )
    ) {
      return;
    }
    setIsDeletingAll(true);
    try {
      await deleteAllSales().unwrap();
      toast.success("All sales deleted successfully");
      refetch();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to delete all sales";
      toast.error(errorMessage);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setPage(1); // Reset to first page when date range changes
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page when search changes
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Sales History</h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              View all sales transactions
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleDeleteAll}
            disabled={isDeletingAll || (data?.sales.length || 0) === 0}
            className="text-red-600 hover:text-red-700"
          >
            {isDeletingAll ? "Deleting..." : "Delete All"}
          </Button>
        </div>

        {/* All Time Summary */}
        <AllTimeSummaryCards className="mb-6" compact />

        {/* Date Range Filter */}
        <div className="mb-6">
          <DateRangeSelector
            value={dateRange}
            onChange={handleDateRangeChange}
          />
        </div>

        {/* Period Summary Cards */}
        <PeriodStatsCards
          dateRange={dateRange}
          showExpenses={false}
          showProfitMargin={true}
          showAverageOrder={false}
          compact
          className="mb-6"
        />

        {/* Sales Table */}
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search by sale #, customer name, or phone..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            <div>
              <span className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-700">
                  {data?.sales.length || 0}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700">
                  {data?.pagination?.total || 0}
                </span>{" "}
                sales
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-gray-500">Loading sales...</div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                    #
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                    Sale Number
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                    Customer
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                    Date
                  </th>
                  <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                    Payment Method
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                    Total
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                    Profit
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data?.sales.map((sale, index) => (
                  <tr key={sale.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-center text-sm text-gray-500 sm:px-4">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium sm:px-6">
                      {sale.sale_number}
                    </td>
                    <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                      {sale.customer_name || "Walk-in"}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 sm:px-6">
                      {formatDateTime(sale.created_at)}
                    </td>
                    <td className="hidden px-3 py-4 text-sm capitalize text-gray-500 sm:table-cell sm:px-6">
                      {sale.payment_method}
                    </td>
                    <td className="px-3 py-4 text-sm font-semibold sm:px-6">
                      {formatCurrency(sale.final_amount)}
                    </td>
                    <td className="px-3 py-4 text-sm font-semibold text-green-600 sm:px-6">
                      {formatCurrency(sale.total_profit || 0)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium sm:px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View
                        </Link>
                        <button
                          onClick={() =>
                            handleDelete(sale.id, sale.sale_number)
                          }
                          disabled={deletingId === sale.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          title="Delete sale"
                        >
                          {deletingId === sale.id ? (
                            "..."
                          ) : (
                            <svg
                              className="h-4 w-4"
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
          )}
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
      </DashboardLayout>
    </ProtectedRoute>
  );
}

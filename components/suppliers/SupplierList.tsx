"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useGetSuppliersQuery,
  useDeleteSupplierMutation,
  useDeleteAllSuppliersMutation,
  useImportSuppliersMutation,
  CreateSupplierRequest,
} from "@/lib/api/suppliersApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { SupplierForm } from "./SupplierForm";
import { ImportExport } from "@/components/common/ImportExport";
import { useCurrency } from "@/lib/hooks/useCurrency";
import toast from "react-hot-toast";

type SortColumn = "total_purchases" | "total_paid" | "balance" | null;
type SortDirection = "asc" | "desc";

export function SupplierList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const { data, isLoading, refetch } = useGetSuppliersQuery({ page, limit });
  const [deleteSupplier] = useDeleteSupplierMutation();
  const [deleteAllSuppliers] = useDeleteAllSuppliersMutation();
  const [importSuppliers] = useImportSuppliersMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { format: formatCurrency } = useCurrency();

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (id: number) => {
    if (deletingId === id) return; // Prevent double click
    if (confirm("Are you sure you want to delete this supplier?")) {
      setDeletingId(id);
      try {
        await deleteSupplier(id).unwrap();
        toast.success("Supplier deleted successfully");
        refetch();
      } catch (error) {
        const errorMessage =
          (error as { data?: { error?: string } })?.data?.error ||
          "Failed to delete supplier";
        toast.error(errorMessage);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleEdit = (id: number) => {
    setEditingSupplier(id);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL suppliers? This action cannot be undone!"
      )
    ) {
      return;
    }
    setIsDeletingAll(true);
    try {
      await deleteAllSuppliers().unwrap();
      toast.success("All suppliers deleted successfully");
      refetch();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to delete all suppliers";
      toast.error(errorMessage);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleImport = async (
    items: Record<string, unknown>[]
  ): Promise<{ imported: number; errors: string[] }> => {
    try {
      const suppliers: CreateSupplierRequest[] = items.map((item) => ({
        name: String(item.name || item.Name || ""),
        contact_person:
          item.contact_person || item["Contact Person"]
            ? String(item.contact_person || item["Contact Person"])
            : undefined,
        email:
          item.email || item.Email
            ? String(item.email || item.Email)
            : undefined,
        phone:
          item.phone || item.Phone
            ? String(item.phone || item.Phone)
            : undefined,
        address:
          item.address || item.Address
            ? String(item.address || item.Address)
            : undefined,
      }));

      const result = await importSuppliers({ suppliers }).unwrap();
      return result;
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to import suppliers";
      throw new Error(errorMessage);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const exportData = (data?.suppliers || []).map((s) => ({
    name: s.name,
    contact_person: s.contact_person || "",
    email: s.email || "",
    phone: s.phone || "",
    address: s.address || "",
  }));

  const exportHeaders = ["name", "contact_person", "email", "phone", "address"];

  // Template data with example values
  const templateData = [
    {
      name: "ABC Suppliers Inc",
      contact_person: "Jane Smith",
      email: "jane.smith@abcsuppliers.com",
      phone: "+1234567890",
      address: "456 Business Ave, City, State 12345",
    },
  ];

  // Sort suppliers
  const sortedSuppliers = [...(data?.suppliers || [])].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: number;
    let bValue: number;

    switch (sortColumn) {
      case "total_purchases":
        aValue = a.total_purchases || 0;
        bValue = b.total_purchases || 0;
        break;
      case "total_paid":
        aValue = a.total_paid || 0;
        bValue = b.total_paid || 0;
        break;
      case "balance":
        aValue = a.balance || 0;
        bValue = b.balance || 0;
        break;
      default:
        return 0;
    }

    if (sortDirection === "asc") {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">All Suppliers</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ImportExport
            data={exportData}
            headers={exportHeaders}
            filename="suppliers"
            onImport={handleImport}
            onImportSuccess={refetch}
            templateData={templateData}
          />
          <Button
            variant="outline"
            onClick={handleDeleteAll}
            disabled={isDeletingAll || (data?.suppliers.length || 0) === 0}
            className="text-red-600 hover:text-red-700"
          >
            {isDeletingAll ? "Deleting..." : "Delete All"}
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>Add Supplier</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
          <span className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-700">
              {data?.suppliers.length || 0}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {data?.pagination?.total || 0}
            </span>{" "}
            suppliers
          </span>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-4">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Name
              </th>
              <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                Contact Person
              </th>
              <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                Email
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Phone
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100 sm:px-6"
                onClick={() => handleSort("total_purchases")}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Purchases
                  {sortColumn === "total_purchases" && (
                    <span className="text-indigo-600">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100 sm:px-6"
                onClick={() => handleSort("total_paid")}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Paid
                  {sortColumn === "total_paid" && (
                    <span className="text-indigo-600">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 transition-colors hover:bg-gray-100 sm:px-6"
                onClick={() => handleSort("balance")}
              >
                <div className="flex items-center justify-end gap-1">
                  Balance
                  {sortColumn === "balance" && (
                    <span className="text-indigo-600">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedSuppliers.map((supplier, index) => (
              <tr key={supplier.id}>
                <td className="whitespace-nowrap px-3 py-4 text-center text-sm text-gray-500 sm:px-4">
                  {(page - 1) * limit + index + 1}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium sm:px-6">
                  {supplier.name}
                </td>
                <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                  {supplier.contact_person || "-"}
                </td>
                <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                  {supplier.email || "-"}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500 sm:px-6">
                  {supplier.phone || "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-500 sm:px-6">
                  {formatCurrency(supplier.total_purchases || 0)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm text-gray-500 sm:px-6">
                  {formatCurrency(supplier.total_paid || 0)}
                </td>
                <td
                  className={`whitespace-nowrap px-3 py-4 text-right text-sm font-medium sm:px-6 ${
                    (supplier.balance || 0) > 0
                      ? "text-red-600"
                      : (supplier.balance || 0) < 0
                        ? "text-green-600"
                        : "text-gray-600"
                  }`}
                >
                  {formatCurrency(supplier.balance || 0)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium sm:px-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-end">
                    <Link
                      href={`/suppliers/${supplier.id}/ledger`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Ledger
                    </Link>
                    <button
                      onClick={() => handleEdit(supplier.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.id)}
                      disabled={deletingId === supplier.id}
                      className="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === supplier.id ? "Deleting..." : "Delete"}
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
        isOpen={isModalOpen}
        onClose={handleClose}
        title={editingSupplier ? "Edit Supplier" : "Add Supplier"}
      >
        <SupplierForm
          supplierId={editingSupplier}
          onSuccess={() => {
            handleClose();
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}

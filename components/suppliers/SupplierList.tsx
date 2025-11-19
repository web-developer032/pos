"use client";

import { useState } from "react";
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
import toast from "react-hot-toast";

export function SupplierList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const { data, isLoading, refetch } = useGetSuppliersQuery({ page, limit });
  const [deleteSupplier] = useDeleteSupplierMutation();
  const [deleteAllSuppliers] = useDeleteAllSuppliersMutation();
  const [importSuppliers] = useImportSuppliersMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDelete = async (id: number) => {
    if (deletingId === id) return; // Prevent double click
    if (confirm("Are you sure you want to delete this supplier?")) {
      setDeletingId(id);
      try {
        await deleteSupplier(id).unwrap();
        toast.success("Supplier deleted successfully");
        refetch();
      } catch (error: any) {
        toast.error(error.data?.error || "Failed to delete supplier");
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
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to delete all suppliers");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleImport = async (
    items: any[]
  ): Promise<{ imported: number; errors: string[] }> => {
    try {
      const suppliers: CreateSupplierRequest[] = items.map((item) => ({
        name: item.name || item.Name || "",
        contact_person:
          item.contact_person || item["Contact Person"] || undefined,
        email: item.email || item.Email || undefined,
        phone: item.phone || item.Phone || undefined,
        address: item.address || item.Address || undefined,
      }));

      const result = await importSuppliers({ suppliers }).unwrap();
      return result;
    } catch (error: any) {
      throw new Error(error.data?.error || "Failed to import suppliers");
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.suppliers.map((supplier) => (
              <tr key={supplier.id}>
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
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium sm:px-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-end">
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

"use client";

import { useState } from "react";
import {
  useGetSuppliersQuery,
  useDeleteSupplierMutation,
} from "@/lib/api/suppliersApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SupplierForm } from "./SupplierForm";
import toast from "react-hot-toast";

export function SupplierList() {
  const { data, isLoading, refetch } = useGetSuppliersQuery();
  const [deleteSupplier] = useDeleteSupplierMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      try {
        await deleteSupplier(id).unwrap();
        toast.success("Supplier deleted successfully");
        refetch();
      } catch (error: any) {
        toast.error(error.data?.error || "Failed to delete supplier");
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">All Suppliers</h2>
        <Button onClick={() => setIsModalOpen(true)}>Add Supplier</Button>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Contact Person
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Phone
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.suppliers.map((supplier) => (
              <tr key={supplier.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                  {supplier.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {supplier.contact_person || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {supplier.email || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {supplier.phone || "-"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(supplier.id)}
                    className="mr-4 text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

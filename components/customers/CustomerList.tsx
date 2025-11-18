"use client";

import { useState } from "react";
import {
  useGetCustomersQuery,
  useDeleteCustomerMutation,
  useImportCustomersMutation,
  CreateCustomerRequest,
} from "@/lib/api/customersApi";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CustomerForm } from "./CustomerForm";
import { ImportExport } from "@/components/common/ImportExport";
import toast from "react-hot-toast";

export function CustomerList() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const { data, isLoading, refetch } = useGetCustomersQuery({
    search: debouncedSearch || undefined,
  });
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [importCustomers] = useImportCustomersMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (id: number) => {
    if (deletingId === id) return; // Prevent double click
    if (confirm("Are you sure you want to delete this customer?")) {
      setDeletingId(id);
      try {
        await deleteCustomer(id).unwrap();
        toast.success("Customer deleted successfully");
        refetch();
      } catch (error: any) {
        toast.error(error.data?.error || "Failed to delete customer");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleEdit = (id: number) => {
    setEditingCustomer(id);
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleImport = async (
    items: any[]
  ): Promise<{ imported: number; errors: string[] }> => {
    try {
      const customers: CreateCustomerRequest[] = items.map((item) => ({
        name: item.name || item.Name || "",
        email: item.email || item.Email || undefined,
        phone: item.phone || item.Phone || undefined,
        address: item.address || item.Address || undefined,
        loyalty_points:
          item.loyalty_points || item["Loyalty Points"]
            ? parseInt(item.loyalty_points || item["Loyalty Points"])
            : undefined,
      }));

      const result = await importCustomers({ customers }).unwrap();
      return result;
    } catch (error: any) {
      throw new Error(error.data?.error || "Failed to import customers");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const exportData = (data?.customers || []).map((c) => ({
    name: c.name,
    email: c.email || "",
    phone: c.phone || "",
    address: c.address || "",
    loyalty_points: c.loyalty_points,
  }));

  const exportHeaders = ["name", "email", "phone", "address", "loyalty_points"];

  // Template data with example values
  const templateData = [
    {
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      address: "123 Main St, City, State 12345",
      loyalty_points: "0",
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">All Customers</h2>
        <div className="flex gap-2">
          <ImportExport
            data={exportData}
            headers={exportHeaders}
            filename="customers"
            onImport={handleImport}
            onImportSuccess={refetch}
            templateData={templateData}
          />
          <Button onClick={() => setIsModalOpen(true)}>Add Customer</Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Loyalty Points
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.customers.map((customer) => (
              <tr key={customer.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium ">
                  {customer.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {customer.email || "-"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {customer.phone || "-"}
                </td>
                <td className="px-6 py-4 text-sm ">
                  {customer.loyalty_points}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(customer.id)}
                    className="mr-4 text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    disabled={deletingId === customer.id}
                    className="text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === customer.id ? "Deleting..." : "Delete"}
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
        title={editingCustomer ? "Edit Customer" : "Add Customer"}
      >
        <CustomerForm
          customerId={editingCustomer}
          onSuccess={() => {
            handleClose();
            refetch();
          }}
        />
      </Modal>
    </div>
  );
}

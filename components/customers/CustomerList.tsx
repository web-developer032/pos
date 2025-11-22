"use client";

import { useState, useEffect } from "react";
import {
  useGetCustomersQuery,
  useDeleteCustomerMutation,
  useDeleteAllCustomersMutation,
  useImportCustomersMutation,
  CreateCustomerRequest,
} from "@/lib/api/customersApi";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { CustomerForm } from "./CustomerForm";
import { ImportExport } from "@/components/common/ImportExport";
import toast from "react-hot-toast";

export function CustomerList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, refetch } = useGetCustomersQuery({
    search: debouncedSearch || undefined,
    page,
    limit,
  });
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [deleteAllCustomers] = useDeleteAllCustomersMutation();
  const [importCustomers] = useImportCustomersMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const handleDelete = async (id: number) => {
    if (deletingId === id) return; // Prevent double click
    if (confirm("Are you sure you want to delete this customer?")) {
      setDeletingId(id);
      try {
        await deleteCustomer(id).unwrap();
        toast.success("Customer deleted successfully");
        refetch();
      } catch (error) {
        const errorMessage =
          (error as { data?: { error?: string } })?.data?.error ||
          "Failed to delete customer";
        toast.error(errorMessage);
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

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL customers? This action cannot be undone!"
      )
    ) {
      return;
    }
    setIsDeletingAll(true);
    try {
      await deleteAllCustomers().unwrap();
      toast.success("All customers deleted successfully");
      refetch();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to delete all customers";
      toast.error(errorMessage);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleImport = async (
    items: Record<string, unknown>[]
  ): Promise<{ imported: number; errors: string[] }> => {
    try {
      const customers: CreateCustomerRequest[] = items.map((item) => ({
        name: String(item.name || item.Name || ""),
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
        loyalty_points:
          item.loyalty_points || item["Loyalty Points"]
            ? parseInt(String(item.loyalty_points || item["Loyalty Points"]))
            : undefined,
      }));

      const result = await importCustomers({ customers }).unwrap();
      return result;
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to import customers";
      throw new Error(errorMessage);
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">All Customers</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ImportExport
            data={exportData}
            headers={exportHeaders}
            filename="customers"
            onImport={handleImport}
            onImportSuccess={refetch}
            templateData={templateData}
          />
          <Button
            variant="outline"
            onClick={handleDeleteAll}
            disabled={isDeletingAll || (data?.customers.length || 0) === 0}
            className="text-red-600 hover:text-red-700"
          >
            {isDeletingAll ? "Deleting..." : "Delete All"}
          </Button>
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

      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Name
              </th>
              <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                Email
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Phone
              </th>
              <th className="hidden px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                Loyalty Points
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.customers.map((customer) => (
              <tr key={customer.id}>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium sm:px-6">
                  {customer.name}
                </td>
                <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                  {customer.email || "-"}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500 sm:px-6">
                  {customer.phone || "-"}
                </td>
                <td className="hidden px-3 py-4 text-sm sm:table-cell sm:px-6">
                  {customer.loyalty_points}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium sm:px-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-end">
                    <button
                      onClick={() => handleEdit(customer.id)}
                      className="text-indigo-600 hover:text-indigo-900"
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

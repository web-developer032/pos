"use client";

import { useState, useMemo } from "react";
import {
  useGetCustomersQuery,
  useDeleteCustomerMutation,
  useDeleteAllCustomersMutation,
  useImportCustomersMutation,
  CreateCustomerRequest,
  Customer,
} from "@/lib/api/customersApi";
import { useListManagement } from "@/lib/hooks/useListManagement";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { CustomerForm } from "./CustomerForm";
import { CustomerCreditDetail } from "./CustomerCreditDetail";
import { ImportExport } from "@/components/common/ImportExport";
import toast from "react-hot-toast";

export function CustomerList() {
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [viewingCreditCustomer, setViewingCreditCustomer] =
    useState<Customer | null>(null);
  const { format: formatCurrency } = useCurrency();

  // Use list management hook
  const {
    search,
    debouncedSearch,
    setSearch,
    page,
    limit,
    setPage,
    setLimit,
    isModalOpen,
    editingId,
    deletingId,
    openCreateModal,
    openEditModal,
    closeModal,
    setDeleting,
  } = useListManagement();

  const { data, isLoading, refetch } = useGetCustomersQuery({
    search: debouncedSearch || undefined,
    page,
    limit,
  });
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [deleteAllCustomers] = useDeleteAllCustomersMutation();
  const [importCustomers] = useImportCustomersMutation();

  // Calculate total receivables (only positive balances - money owed TO the business)
  const totalReceivables = useMemo(() => {
    return (
      data?.customers.reduce((sum, c) => {
        const balance = c.credit_balance || 0;
        return balance > 0 ? sum + balance : sum;
      }, 0) || 0
    );
  }, [data?.customers]);

  // Calculate total credits owed BY the business to customers (negative balances)
  const totalCreditsOwed = useMemo(() => {
    return (
      data?.customers.reduce((sum, c) => {
        const balance = c.credit_balance || 0;
        return balance < 0 ? sum + Math.abs(balance) : sum;
      }, 0) || 0
    );
  }, [data?.customers]);

  const customersWithCredit = useMemo(() => {
    return (
      data?.customers.filter((c) => (c.credit_balance || 0) > 0).length || 0
    );
  }, [data?.customers]);

  const customersWithStoredCredit = useMemo(() => {
    return (
      data?.customers.filter((c) => (c.credit_balance || 0) < 0).length || 0
    );
  }, [data?.customers]);

  const handleDelete = async (id: number) => {
    if (deletingId === id) return; // Prevent double click
    if (confirm("Are you sure you want to delete this customer?")) {
      setDeleting(id);
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
        setDeleting(null);
      }
    }
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
      {/* Summary Cards */}
      {(totalReceivables > 0 || totalCreditsOwed > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {totalReceivables > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-600">
                Total Receivables
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {formatCurrency(totalReceivables)}
              </p>
              <p className="mt-1 text-xs text-amber-600">
                From {customersWithCredit} customer
                {customersWithCredit !== 1 ? "s" : ""}
              </p>
            </div>
          )}
          {totalCreditsOwed > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-600">
                Customer Credits
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-700">
                {formatCurrency(totalCreditsOwed)}
              </p>
              <p className="mt-1 text-xs text-blue-600">
                Owed to {customersWithStoredCredit} customer
                {customersWithStoredCredit !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}

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
          <Button onClick={openCreateModal}>Add Customer</Button>
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
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
          <span className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-700">
              {data?.customers.length || 0}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-700">
              {data?.pagination?.total || 0}
            </span>{" "}
            customers
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
                Email
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Phone
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Balance Owed
              </th>
              <th className="hidden px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6">
                Loyalty
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.customers.map((customer, index) => (
              <tr
                key={customer.id}
                className={
                  (customer.credit_balance || 0) > 0
                    ? "bg-amber-50"
                    : (customer.credit_balance || 0) < 0
                      ? "bg-blue-50"
                      : ""
                }
              >
                <td className="whitespace-nowrap px-3 py-4 text-center text-sm text-gray-500 sm:px-4">
                  {(page - 1) * limit + index + 1}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium sm:px-6">
                  {customer.name}
                </td>
                <td className="hidden px-3 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                  {customer.email || "-"}
                </td>
                <td className="px-3 py-4 text-sm text-gray-500 sm:px-6">
                  {customer.phone || "-"}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm sm:px-6">
                  {(customer.credit_balance || 0) > 0 ? (
                    <button
                      onClick={() => setViewingCreditCustomer(customer)}
                      className="font-semibold text-amber-600 hover:text-amber-800 hover:underline"
                    >
                      {formatCurrency(customer.credit_balance || 0)}
                    </button>
                  ) : (customer.credit_balance || 0) < 0 ? (
                    <button
                      onClick={() => setViewingCreditCustomer(customer)}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      title="Customer has credit"
                    >
                      -{formatCurrency(Math.abs(customer.credit_balance || 0))}
                    </button>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="hidden px-3 py-4 text-center text-sm sm:table-cell sm:px-6">
                  {customer.loyalty_points}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium sm:px-6">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-end sm:gap-2">
                    {(customer.credit_balance || 0) !== 0 && (
                      <button
                        onClick={() => setViewingCreditCustomer(customer)}
                        className={
                          (customer.credit_balance || 0) > 0
                            ? "text-amber-600 hover:text-amber-800"
                            : "text-blue-600 hover:text-blue-800"
                        }
                      >
                        {(customer.credit_balance || 0) > 0 ? "Owes" : "Credit"}
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(customer.id)}
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
            onPageChange={setPage}
            onItemsPerPageChange={setLimit}
          />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Customer" : "Add Customer"}
      >
        <CustomerForm
          customerId={editingId || undefined}
          onSuccess={() => {
            closeModal();
            refetch();
          }}
        />
      </Modal>

      {/* Credit Detail Modal */}
      <Modal
        isOpen={!!viewingCreditCustomer}
        onClose={() => setViewingCreditCustomer(null)}
        title={`Credit Details - ${viewingCreditCustomer?.name || ""}`}
        size="lg"
      >
        {viewingCreditCustomer && (
          <CustomerCreditDetail
            customerId={viewingCreditCustomer.id}
            onPaymentSuccess={() => {
              refetch();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

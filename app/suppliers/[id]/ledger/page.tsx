"use client";

import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetSupplierQuery,
  useGetSupplierLedgerQuery,
  useCreateSupplierPaymentMutation,
} from "@/lib/api/suppliersApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

interface PaymentFormData {
  purchase_order_id: string;
  amount: string;
  payment_method: "cash" | "bank_transfer" | "check" | "other";
  reference_number: string;
  notes: string;
}

export default function SupplierLedgerPage() {
  const params = useParams();
  const supplierId = parseInt(params.id as string);
  const { data: supplierData } = useGetSupplierQuery(supplierId);
  const {
    data: ledgerData,
    isLoading,
    refetch,
  } = useGetSupplierLedgerQuery(supplierId);
  const [createPayment] = useCreateSupplierPaymentMutation();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { format: formatCurrency } = useCurrency();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    defaultValues: {
      purchase_order_id: "",
      amount: "",
      payment_method: "cash",
      reference_number: "",
      notes: "",
    },
  });

  const handlePaymentSubmit = async (data: PaymentFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createPayment({
        supplierId,
        data: {
          purchase_order_id:
            data.purchase_order_id === ""
              ? undefined
              : parseInt(data.purchase_order_id),
          amount: parseFloat(data.amount),
          payment_method: data.payment_method,
          reference_number:
            data.reference_number === "" ? undefined : data.reference_number,
          notes: data.notes === "" ? undefined : data.notes,
        },
      }).unwrap();
      toast.success("Payment recorded successfully");
      reset();
      setIsPaymentModalOpen(false);
      refetch();
    } catch (error: unknown) {
      const err = error as { data?: { error?: string } };
      toast.error(err.data?.error || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="text-lg">Loading ledger...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!supplierData || !ledgerData) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <div className="text-lg text-red-600">Supplier not found</div>
            <Link href="/suppliers">
              <Button variant="outline">Back to Suppliers</Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const { supplier } = supplierData;
  const { purchase_orders, payments, summary } = ledgerData;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-4">
            <Link href="/suppliers">
              <Button variant="outline" className="flex items-center gap-2">
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Suppliers
              </Button>
            </Link>
          </div>

          <h1 className="text-3xl font-bold">{supplier.name} - Ledger</h1>
          <p className="mt-2 text-gray-600">
            {supplier.email && `${supplier.email} • `}
            {supplier.phone}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">
              Total Purchases
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {formatCurrency(summary.total_purchases)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Total Paid</div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(summary.total_paid)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-500">Balance</div>
            <div
              className={`mt-2 text-2xl font-bold ${
                summary.balance > 0
                  ? "text-red-600"
                  : summary.balance < 0
                    ? "text-green-600"
                    : "text-gray-900"
              }`}
            >
              {formatCurrency(Math.abs(summary.balance))}
              {summary.balance > 0 && " (Owed)"}
              {summary.balance < 0 && " (Credit)"}
            </div>
          </div>
        </div>

        <div className="mb-4 flex justify-end">
          <Button onClick={() => setIsPaymentModalOpen(true)}>
            + Record Payment
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Purchase Orders */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">Purchase Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {purchase_orders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        No purchase orders found
                      </td>
                    </tr>
                  ) : (
                    purchase_orders.map((po) => (
                      <tr key={po.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          {po.po_number}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {format(new Date(po.created_at), "MMM dd, yyyy")}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold">
                          {formatCurrency(po.total_amount)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <span
                            className={`rounded px-2 py-1 text-xs ${
                              po.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : po.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">Payments</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Method
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {payments.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        No payments recorded
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {format(new Date(payment.created_at), "MMM dd, yyyy")}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {payment.po_number || "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-500">
                          {payment.payment_method.replace("_", " ")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Payment Modal */}
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            reset();
          }}
          title="Record Payment"
          size="md"
        >
          <form
            onSubmit={handleSubmit(handlePaymentSubmit)}
            className="space-y-4"
          >
            <Select
              label="Purchase Order (Optional)"
              options={[
                { value: "", label: "General Payment" },
                ...purchase_orders
                  .filter((po) => po.status === "completed")
                  .map((po) => ({
                    value: po.id.toString(),
                    label: `${po.po_number} - ${formatCurrency(po.total_amount)}`,
                  })),
              ]}
              {...register("purchase_order_id")}
            />

            <Input
              label="Amount *"
              type="number"
              step="0.01"
              min="0.01"
              {...register("amount", {
                required: "Amount is required",
                min: { value: 0.01, message: "Amount must be greater than 0" },
              })}
              error={errors.amount?.message}
            />

            <Select
              label="Payment Method *"
              options={[
                { value: "cash", label: "Cash" },
                { value: "bank_transfer", label: "Bank Transfer" },
                { value: "check", label: "Check" },
                { value: "other", label: "Other" },
              ]}
              {...register("payment_method", {
                required: "Payment method is required",
              })}
              error={errors.payment_method?.message}
            />

            <Input
              label="Reference Number (Optional)"
              {...register("reference_number")}
              placeholder="Check number, transaction ID, etc."
            />

            <Input
              label="Notes (Optional)"
              {...register("notes")}
              placeholder="Additional notes"
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

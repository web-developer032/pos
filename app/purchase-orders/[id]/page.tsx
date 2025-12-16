"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetPurchaseOrderQuery,
  useDeletePurchaseOrderMutation,
} from "@/lib/api/purchaseOrdersApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";
import { formatDateTime } from "@/lib/utils/dateTime";
import Link from "next/link";
import toast from "react-hot-toast";

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poId = parseInt(params.id as string);
  const { data, isLoading, error, refetch } = useGetPurchaseOrderQuery(poId);
  const { format: formatCurrency } = useCurrency();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletePurchaseOrder, { isLoading: isDeleting }] =
    useDeletePurchaseOrderMutation();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="text-lg">Loading purchase order details...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !data) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <div className="text-lg text-red-600">Purchase order not found</div>
            <Link href="/purchase-orders">
              <Button variant="outline">Back to Purchase Orders</Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const {
    purchase_order,
    items,
    payments = [],
    total_paid = 0,
  } = data as {
    purchase_order: {
      id: number;
      po_number: string;
      supplier_id: number;
      user_id: number;
      total_amount: number;
      discount_type?: "percentage" | "amount" | null;
      discount_value?: number | null;
      tax_type?: "percentage" | "amount" | null;
      tax_value?: number | null;
      status: "pending" | "completed" | "cancelled";
      created_at: string;
      updated_at: string;
      supplier_name?: string;
      user_name?: string;
    };
    items: Array<{
      id: number;
      po_id: number;
      product_id: number;
      quantity: number;
      unit_cost: number;
      subtotal: number;
      product_name?: string;
    }>;
    payments: Array<{
      id: number;
      amount: number;
      payment_method: string;
      reference_number?: string;
      notes?: string;
      created_at: string;
      user_name?: string;
    }>;
    total_paid: number;
  };
  const po = purchase_order;
  const remainingBalance = po.total_amount - total_paid;

  // Calculate subtotal and discount amount
  const itemsSubtotal = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_cost || 0),
    0
  );

  let discountAmount = 0;
  if (po.discount_type && po.discount_value) {
    if (po.discount_type === "percentage") {
      discountAmount = (itemsSubtotal * po.discount_value) / 100;
    } else {
      discountAmount = po.discount_value;
    }
  }

  const afterDiscount = Math.max(0, itemsSubtotal - discountAmount);

  let taxAmount = 0;
  if (po.tax_type && po.tax_value) {
    if (po.tax_type === "percentage") {
      taxAmount = (afterDiscount * po.tax_value) / 100;
    } else {
      taxAmount = po.tax_value;
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete purchase order ${po.po_number}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deletePurchaseOrder(poId).unwrap();
      toast.success("Purchase order deleted successfully");
      router.push("/purchase-orders");
    } catch (error: unknown) {
      const err = error as { data?: { error?: string } };
      toast.error(err.data?.error || "Failed to delete purchase order");
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-4">
            <Link href="/purchase-orders">
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
                Back to Purchase Orders
              </Button>
            </Link>
            <Button
              onClick={() => setIsEditModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Edit
            </Button>
            {po.status === "pending" && (
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            )}
            {po.status !== "pending" && (
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            )}
          </div>

          <h1 className="text-3xl font-bold">Purchase Order Details</h1>
          <p className="mt-2 text-gray-600">PO Number: {po.po_number}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Purchase Order Information */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">
                  Purchase Order Information
                </h2>
              </div>
              <div className="px-6 py-4">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      PO Number
                    </dt>
                    <dd className="mt-1 text-sm font-semibold">
                      {po.po_number}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date</dt>
                    <dd className="mt-1 text-sm">
                      {formatDateTime(po.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Supplier
                    </dt>
                    <dd className="mt-1 text-sm">
                      {po.supplier_name || "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Created By
                    </dt>
                    <dd className="mt-1 text-sm">{po.user_name || "N/A"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Status
                    </dt>
                    <dd className="mt-1 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          po.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : po.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {po.status}
                      </span>
                    </dd>
                  </div>
                  {po.updated_at && po.updated_at !== po.created_at && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Last Updated
                      </dt>
                      <dd className="mt-1 text-sm">
                        {formatDateTime(po.updated_at)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="mt-6 rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">Payment Summary</h2>
              </div>
              <div className="px-6 py-4">
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-gray-500">
                      Total Amount
                    </dt>
                    <dd className="text-sm font-semibold">
                      {formatCurrency(po.total_amount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-gray-500">
                      Amount Paid
                    </dt>
                    <dd className="text-sm font-semibold text-green-600">
                      {formatCurrency(total_paid)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                    <dt className="text-sm font-semibold text-gray-700">
                      Remaining Balance
                    </dt>
                    <dd
                      className={`text-sm font-bold ${
                        remainingBalance > 0
                          ? "text-red-600"
                          : remainingBalance < 0
                            ? "text-blue-600"
                            : "text-green-600"
                      }`}
                    >
                      {remainingBalance < 0 && "(Overpaid) "}
                      {formatCurrency(Math.abs(remainingBalance))}
                    </dd>
                  </div>
                </dl>

                {/* Payment status indicator */}
                <div className="mt-4">
                  {remainingBalance <= 0 ? (
                    <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-medium">Fully Paid</span>
                    </div>
                  ) : total_paid > 0 ? (
                    <div className="flex items-center gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-medium">Partially Paid</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="font-medium">Unpaid</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Payment History */}
            {payments.length > 0 && (
              <div className="mt-6 rounded-lg bg-white shadow">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h2 className="text-lg font-semibold">Payment History</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <div key={payment.id} className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-xs capitalize text-gray-500">
                            {payment.payment_method.replace("_", " ")}
                            {payment.reference_number &&
                              ` • ${payment.reference_number}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {formatDateTime(payment.created_at)}
                          </p>
                          <p className="text-xs text-gray-400">
                            by {payment.user_name}
                          </p>
                        </div>
                      </div>
                      {payment.notes && (
                        <p className="mt-1 text-xs italic text-gray-500">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Purchase Order Items */}
          <div className="lg:col-span-3">
            <div className="rounded-lg bg-white shadow">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold">Items</h2>
                <span className="text-sm text-gray-500">
                  Total:{" "}
                  <span className="font-semibold text-gray-700">
                    {items.length}
                  </span>{" "}
                  items
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Product
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Unit Cost
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {items.map((item, index) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          {item.product_name || "Deleted Product"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          {item.quantity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          {formatCurrency(item.unit_cost)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-gray-200 px-6 py-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-end gap-4">
                    <span className="text-base font-medium text-gray-700">
                      Subtotal:
                    </span>
                    <span className="text-base font-medium">
                      {formatCurrency(itemsSubtotal)}
                    </span>
                  </div>
                  {po.discount_type &&
                    po.discount_value &&
                    po.discount_value > 0 && (
                      <div className="flex items-center justify-end gap-4 text-red-600">
                        <span className="text-base font-medium">
                          Discount (
                          {po.discount_type === "percentage"
                            ? `${po.discount_value}%`
                            : formatCurrency(po.discount_value)}
                          ):
                        </span>
                        <span className="text-base font-medium">
                          -{formatCurrency(discountAmount)}
                        </span>
                      </div>
                    )}
                  {po.tax_type && po.tax_value && po.tax_value > 0 && (
                    <div className="flex items-center justify-end gap-4 text-green-600">
                      <span className="text-base font-medium">
                        Tax (
                        {po.tax_type === "percentage"
                          ? `${po.tax_value}%`
                          : formatCurrency(po.tax_value)}
                        ):
                      </span>
                      <span className="text-base font-medium">
                        +{formatCurrency(taxAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-2">
                    <span className="text-base font-semibold text-gray-700">
                      Total Amount:
                    </span>
                    <span className="text-base font-bold text-indigo-600">
                      {formatCurrency(po.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Purchase Order"
          size="2xl"
        >
          <PurchaseOrderForm
            purchaseOrderId={poId}
            onSuccess={() => {
              setIsEditModalOpen(false);
              refetch();
            }}
          />
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

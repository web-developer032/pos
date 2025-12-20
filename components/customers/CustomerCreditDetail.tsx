"use client";

import { useState } from "react";
import Link from "next/link";
import { useGetCustomerCreditQuery } from "@/lib/api/customersApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { formatDateTime } from "@/lib/utils/dateTime";
import { Button } from "@/components/ui/Button";
import { CustomerPaymentForm } from "./CustomerPaymentForm";

interface CustomerCreditDetailProps {
  customerId: number;
  onPaymentSuccess?: () => void;
}

export function CustomerCreditDetail({
  customerId,
  onPaymentSuccess,
}: CustomerCreditDetailProps) {
  const { format: formatCurrency } = useCurrency();
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const { data, isLoading, refetch } = useGetCustomerCreditQuery(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading credit details...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-8 text-center text-red-600">
        Failed to load credit details
      </div>
    );
  }

  const { customer, unpaid_sales, recent_payments, summary } = data;

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    refetch();
    onPaymentSuccess?.();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-600">Current Balance</p>
          <p className="text-2xl font-bold text-amber-700">
            {formatCurrency(customer.credit_balance)}
          </p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-600">Total Payments</p>
          <p className="text-2xl font-bold text-green-700">
            {formatCurrency(summary.total_payments_received)}
          </p>
        </div>
      </div>

      {/* Record Payment Button / Form */}
      {customer.credit_balance > 0 && (
        <div>
          {showPaymentForm ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-4 font-semibold text-gray-900">
                Record Payment
              </h3>
              <CustomerPaymentForm
                customerId={customerId}
                currentBalance={customer.credit_balance}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setShowPaymentForm(false)}
              />
            </div>
          ) : (
            <Button onClick={() => setShowPaymentForm(true)} className="w-full">
              Record Payment
            </Button>
          )}
        </div>
      )}

      {/* Unpaid Sales */}
      {unpaid_sales.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">
            Unpaid/Partial Sales ({unpaid_sales.length})
          </h3>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Sale #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Date
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    Total
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    Paid
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    Due
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {unpaid_sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      {sale.sale_number}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {formatDateTime(sale.created_at)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-gray-700">
                      {formatCurrency(sale.final_amount)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-green-600">
                      {formatCurrency(sale.amount_paid)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-medium text-amber-600">
                      {formatCurrency(sale.amount_due)}
                    </td>
                    <td className="px-3 py-2 text-center text-sm">
                      <Link
                        href={`/sales/${sale.id}`}
                        target="_blank"
                        className="text-indigo-600 hover:text-indigo-900 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Payments */}
      {recent_payments.length > 0 && (
        <div>
          <h3 className="mb-3 font-semibold text-gray-900">Recent Payments</h3>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Date
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                    Amount
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Method
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Recorded By
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {recent_payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {formatDateTime(payment.created_at)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-3 py-2 text-sm capitalize text-gray-700">
                      {payment.payment_method.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-500">
                      {payment.recorded_by || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Credit */}
      {customer.credit_balance === 0 && unpaid_sales.length === 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <svg
            className="mx-auto mb-3 h-12 w-12 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-lg font-medium text-green-700">All Paid Up!</p>
          <p className="mt-1 text-sm text-green-600">
            This customer has no outstanding balance.
          </p>
        </div>
      )}
    </div>
  );
}

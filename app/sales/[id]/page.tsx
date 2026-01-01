"use client";

import { useParams } from "next/navigation";
import { useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetSaleQuery } from "@/lib/api/salesApi";
import { useGetSaleReturnsQuery } from "@/lib/api/returnsApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Receipt, type ReceiptRef } from "@/components/pos/Receipt";
import { ReturnForm } from "@/components/sales/ReturnForm";
import { formatDateTime } from "@/lib/utils/dateTime";
import Link from "next/link";
import { useState } from "react";

export default function SaleDetailPage() {
  const params = useParams();
  const saleId = parseInt(params.id as string);
  const { data, isLoading, error } = useGetSaleQuery(saleId);
  const { data: returnsData } = useGetSaleReturnsQuery(saleId);
  const { format: formatCurrency } = useCurrency();
  const receiptRef = useRef<ReceiptRef>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex h-64 items-center justify-center">
            <div className="text-lg">Loading sale details...</div>
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
            <div className="text-lg text-red-600">Sale not found</div>
            <Link href="/sales">
              <Button variant="outline">Back to Sales</Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const { sale, items } = data;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-4">
            <Link href="/sales">
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
                Back to Sales
              </Button>
            </Link>
            <Button
              onClick={() => setIsReturnModalOpen(true)}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              Process Return
            </Button>
            <Button
              onClick={() => receiptRef.current?.print()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Print Receipt
            </Button>
          </div>

          <h1 className="text-3xl font-bold">Sale Details</h1>
          <p className="mt-2 text-gray-600">Sale Number: {sale.sale_number}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Sale Information */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">Sale Information</h2>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Sale Number
                  </dt>
                  <dd className="mt-1 text-sm font-semibold">
                    {sale.sale_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Date</dt>
                  <dd className="mt-1 text-sm">
                    {formatDateTime(sale.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Customer
                  </dt>
                  <dd className="mt-1 text-sm">
                    {sale.customer_name || "Walk-in Customer"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Cashier</dt>
                  <dd className="mt-1 text-sm">{sale.user_name || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Payment Method
                  </dt>
                  <dd className="mt-1 text-sm capitalize">
                    {sale.payment_method}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Payment Status
                  </dt>
                  <dd className="mt-1 text-sm capitalize">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        sale.payment_status === "paid"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {sale.payment_status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">Summary</h2>
            </div>
            <div className="px-6 py-4">
              {(() => {
                // Separate inline returns (refund_amount = 0, already deducted from sale) from regular returns
                const inlineReturns =
                  returnsData?.returns?.filter((r) => r.refund_amount === 0) ||
                  [];
                const regularReturns =
                  returnsData?.returns?.filter((r) => r.refund_amount > 0) || [];

                // Total value from inline returns (for display purposes)
                const inlineReturnsTotal = inlineReturns.reduce(
                  (sum, r) => sum + (r.total_amount || 0),
                  0
                );

                // Total refunds from regular returns (need to subtract from final_amount)
                const regularRefundsTotal = regularReturns.reduce(
                  (sum, r) => sum + (r.refund_amount || 0),
                  0
                );

                // Calculate adjusted subtotal based on effective items (only for regular returns)
                const adjustedSubtotal = items.reduce((sum, item) => {
                  const itemStatus = returnsData?.sale_items_status?.find(
                    (status) => status.id === item.id
                  );
                  const returnedQty = itemStatus?.returned_quantity || 0;
                  const effectiveQty = item.quantity - returnedQty;
                  return sum + effectiveQty * item.unit_price;
                }, 0);

                // Only subtract regular returns (inline returns already in final_amount)
                const adjustedTotal = sale.final_amount - regularRefundsTotal;
                const hasRegularReturns = regularRefundsTotal > 0;
                const hasInlineReturns = inlineReturnsTotal > 0;
                const hasAnyReturns = hasRegularReturns || hasInlineReturns;

                return (
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Subtotal</dt>
                      <dd className="text-sm font-medium">
                        {hasRegularReturns ? (
                          <span>
                            {formatCurrency(adjustedSubtotal)}
                            <span className="ml-2 text-xs text-gray-400 line-through">
                              {formatCurrency(sale.total_amount)}
                            </span>
                          </span>
                        ) : (
                          formatCurrency(sale.total_amount)
                        )}
                      </dd>
                    </div>
                    {sale.discount_amount > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Discount</dt>
                        <dd className="text-sm font-medium text-red-600">
                          -{formatCurrency(sale.discount_amount)}
                        </dd>
                      </div>
                    )}
                    {sale.tax_amount > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Tax</dt>
                        <dd className="text-sm font-medium">
                          {formatCurrency(sale.tax_amount)}
                        </dd>
                      </div>
                    )}
                    {hasInlineReturns && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">
                          Returns (offset)
                        </dt>
                        <dd className="text-sm font-medium text-amber-600">
                          -{formatCurrency(inlineReturnsTotal)}
                        </dd>
                      </div>
                    )}
                    {hasRegularReturns && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">Refunds</dt>
                        <dd className="text-sm font-medium text-red-600">
                          -{formatCurrency(regularRefundsTotal)}
                        </dd>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between">
                        <dt className="text-base font-semibold">Total</dt>
                        <dd className="text-base font-bold text-indigo-600">
                          {hasRegularReturns ? (
                            <span>
                              {formatCurrency(adjustedTotal)}
                              <span className="ml-2 text-xs text-gray-400 line-through">
                                {formatCurrency(sale.final_amount)}
                              </span>
                            </span>
                          ) : (
                            formatCurrency(sale.final_amount)
                          )}
                        </dd>
                      </div>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      {(() => {
                        const originalProfit = items.reduce((sum, item) => {
                          const costPrice = item.cost_price || 0;
                          const profitPerUnit = item.unit_price - costPrice;
                          return sum + profitPerUnit * item.quantity;
                        }, 0);

                        const returnedProfit =
                          returnsData?.return_items?.reduce(
                            (sum, returnItem) => {
                              const saleItem = returnItem.sale_item_id
                                ? items.find(
                                    (si) => si.id === returnItem.sale_item_id
                                  )
                                : null;
                              const costPrice =
                                returnItem.cost_price ||
                                saleItem?.cost_price ||
                                0;
                              const profitPerUnit =
                                returnItem.unit_price - costPrice;
                              return (
                                sum + profitPerUnit * returnItem.quantity
                              );
                            },
                            0
                          ) || 0;

                        const netProfit = originalProfit - returnedProfit;
                        const isLoss = netProfit < 0;

                        return (
                          <div className="flex justify-between">
                            <dt
                              className={`text-base font-semibold ${isLoss ? "text-red-600" : "text-green-600"}`}
                            >
                              {isLoss ? "Net Loss" : "Net Profit"}
                            </dt>
                            <dd
                              className={`text-base font-bold ${isLoss ? "text-red-600" : "text-green-600"}`}
                            >
                              {formatCurrency(Math.abs(netProfit))}
                            </dd>
                          </div>
                        );
                      })()}
                      {hasAnyReturns && (
                        <div className="mt-2 text-xs text-gray-500">
                          After {returnsData?.returns.length} return
                          {(returnsData?.returns.length || 0) > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </dl>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Sale Items */}
        <div className="mt-6 rounded-lg bg-white shadow">
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Barcode
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Subtotal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item, index) => {
                  const costPrice = item.cost_price || 0;
                  const profitPerUnit = item.unit_price - costPrice;

                  // Get return status for this item
                  const itemStatus = returnsData?.sale_items_status?.find(
                    (status) => status.id === item.id
                  );
                  const returnedQty = itemStatus?.returned_quantity || 0;
                  const isFullyReturned = returnedQty >= item.quantity;
                  const isPartiallyReturned =
                    returnedQty > 0 && !isFullyReturned;

                  return (
                    <tr
                      key={item.id}
                      className={isFullyReturned ? "bg-gray-50 opacity-75" : ""}
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {item.product_name}
                          {isFullyReturned && (
                            <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">
                              Returned
                            </span>
                          )}
                          {isPartiallyReturned && (
                            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
                              Partial Return
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {item.barcode || "N/A"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        <div>
                          {item.quantity}
                          {returnedQty > 0 && (
                            <span className="ml-1 text-xs text-red-600">
                              (-{returnedQty})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-red-600">
                        {item.discount > 0
                          ? formatCurrency(item.discount)
                          : "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold">
                        {formatCurrency(item.subtotal)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold">
                        <div className="flex flex-col items-end">
                          {(() => {
                            const originalProfit =
                              profitPerUnit * item.quantity;
                            const returnedProfit = profitPerUnit * returnedQty;
                            const netProfit = originalProfit - returnedProfit;
                            return (
                              <>
                                <span
                                  className={
                                    netProfit >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {formatCurrency(netProfit)}
                                </span>
                                {returnedQty > 0 && (
                                  <span className="text-xs text-gray-500">
                                    (was {formatCurrency(originalProfit)})
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Returns History */}
        {returnsData && returnsData.returns.length > 0 && (
          <div className="mt-6 rounded-lg bg-white shadow">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">Return History</h2>
              <span className="text-sm text-gray-500">
                Total:{" "}
                <span className="font-semibold text-gray-700">
                  {returnsData.returns.length}
                </span>{" "}
                returns
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
                      Return Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Return Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {returnsData.returns.map((returnRecord, index) => (
                    <tr key={returnRecord.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        <Link
                          href={`/returns/${returnRecord.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {returnRecord.return_number}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDateTime(returnRecord.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-red-600">
                        {formatCurrency(returnRecord.total_amount || returnRecord.refund_amount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-500">
                        {returnRecord.refund_method.replace("_", " ")}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {returnRecord.reason || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        <Link
                          href={`/returns/${returnRecord.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Return Modal */}
        <Modal
          isOpen={isReturnModalOpen}
          onClose={() => setIsReturnModalOpen(false)}
          title="Process Return"
          size="lg"
        >
          <ReturnForm
            saleId={saleId}
            saleItems={items}
            onSuccess={() => {
              setIsReturnModalOpen(false);
            }}
          />
        </Modal>

        {/* Hidden receipt for printing */}
        <div className="hidden">
          {(() => {
            // Only count regular returns (refund_amount > 0) for adjusting final amount
            // Inline returns (refund_amount = 0) are already deducted from sale.final_amount
            const regularRefundsTotal =
              returnsData?.returns
                ?.filter((r) => r.refund_amount > 0)
                .reduce((sum, r) => sum + (r.refund_amount || 0), 0) || 0;

            // Filter and adjust items for regular returns only
            const adjustedItems = items
              .map((item) => {
                const itemStatus = returnsData?.sale_items_status?.find(
                  (status) => status.id === item.id
                );
                const returnedQty = itemStatus?.returned_quantity || 0;
                const effectiveQty = item.quantity - returnedQty;

                if (effectiveQty <= 0) return null;

                return {
                  ...item,
                  quantity: effectiveQty,
                  subtotal: effectiveQty * item.unit_price - item.discount,
                };
              })
              .filter(
                (item): item is NonNullable<typeof item> => item !== null
              );

            // Calculate adjusted subtotal from effective items
            const adjustedSubtotal = adjustedItems.reduce(
              (sum, item) => sum + item.quantity * item.unit_price,
              0
            );

            // Adjusted total = original final amount - regular refunds only
            const adjustedTotal = sale.final_amount - regularRefundsTotal;

            // Create adjusted sale object for receipt
            const adjustedSale = {
              ...sale,
              total_amount: adjustedSubtotal,
              final_amount: adjustedTotal,
            };

            return (
              <Receipt
                ref={receiptRef}
                sale={adjustedSale}
                items={adjustedItems}
              />
            );
          })()}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

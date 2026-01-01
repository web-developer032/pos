"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { useCreateSaleMutation } from "@/lib/api/salesApi";
import { useGetCustomersQuery } from "@/lib/api/customersApi";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { roundPrice } from "@/lib/utils/formHelpers";
import type { Sale, SaleItem } from "@/lib/api/salesApi";
import { clearCart, setCustomer } from "@/lib/slices/cartSlice";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Receipt, type ReceiptRef } from "@/components/pos/Receipt";
import toast from "react-hot-toast";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const dispatch = useAppDispatch();
  const { items, customerId, discount, tax } = useAppSelector(
    (state) => state.cart
  );
  const [createSale, { isLoading }] = useCreateSaleMutation();
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "digital"
  >("cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [saleData, setSaleData] = useState<{
    sale: Sale;
    items: SaleItem[];
    returnItemsForReceipt?: {
      product_id: number;
      name: string;
      quantity: number;
      unit_price: number;
    }[];
    amountPaid: number;
    changeAmount?: number;
  } | null>(null);
  const receiptRef = useRef<ReceiptRef>(null);
  const { format: formatCurrency } = useCurrency();

  // Customer search and add
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const { data: customersData, refetch: refetchCustomers } =
    useGetCustomersQuery({
      search: customerSearch || undefined,
      limit: 50,
    });

  // Separate regular items and return items
  const regularItems = items.filter((item) => !item.isReturn);
  const returnItems = items.filter((item) => item.isReturn);

  // Calculate subtotals
  const regularSubtotal = roundPrice(
    regularItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  const returnsTotal = roundPrice(
    returnItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
  const subtotal = roundPrice(regularSubtotal - returnsTotal);
  const finalTotal = roundPrice(subtotal - discount + tax);

  // Amount paying now (default to full amount)
  const [amountPaying, setAmountPaying] = useState<string>("");

  // Reset amount paying when modal opens or total changes
  useEffect(() => {
    if (isOpen) {
      setAmountPaying(finalTotal.toString());
    }
  }, [isOpen, finalTotal]);

  const amountPayingNum = parseFloat(amountPaying) || 0;

  // When total is negative (returns > purchases), shop owes customer
  const isRefundTransaction = finalTotal < 0;
  const refundToCustomer = isRefundTransaction ? Math.abs(finalTotal) : 0;

  // For positive totals: credit is what customer still owes, change is overpayment
  // For negative totals: no credit, change/refund is handled separately
  const creditAmount = isRefundTransaction
    ? 0
    : roundPrice(Math.max(0, finalTotal - amountPayingNum));
  const changeAmount = isRefundTransaction
    ? 0
    : roundPrice(Math.max(0, amountPayingNum - finalTotal));
  const isPartialPayment =
    !isRefundTransaction &&
    amountPayingNum < finalTotal &&
    amountPayingNum >= 0;
  const isFullCredit =
    !isRefundTransaction && amountPayingNum === 0 && finalTotal > 0;
  const isOverpayment = !isRefundTransaction && amountPayingNum > finalTotal;

  // Customer options for dropdown
  const customerOptions = useMemo(() => {
    return (
      customersData?.customers.map((c) => ({
        value: c.id,
        label: `${c.name}${c.phone ? ` (${c.phone})` : ""}${c.credit_balance > 0 ? ` - Owes ${formatCurrency(c.credit_balance)}` : ""}`,
      })) || []
    );
  }, [customersData?.customers, formatCurrency]);

  // Get selected customer info
  const selectedCustomer = useMemo(() => {
    return customersData?.customers.find((c) => c.id === customerId);
  }, [customersData?.customers, customerId]);

  const handlePayment = async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    // Validate: credit sales require a customer (only for positive totals with partial payment)
    if (isPartialPayment && !customerId && finalTotal > 0) {
      toast.error("Please select a customer for credit sales");
      return;
    }

    try {
      const result = await createSale({
        customer_id: customerId,
        items: regularItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        return_items: returnItems.map((item) => ({
          sale_id: item.returnFromSaleId,
          sale_item_id: item.returnFromSaleItemId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.price,
          cost_price: item.costPrice,
        })),
        discount_amount: discount,
        tax_amount: tax,
        payment_method: paymentMethod,
        amount_paid: isRefundTransaction
          ? 0
          : Math.min(amountPayingNum, finalTotal), // 0 for refunds, capped for regular sales
      }).unwrap();

      // Store sale data for receipt (including return items for display)
      setSaleData({
        ...result,
        returnItemsForReceipt: returnItems.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
        })),
        amountPaid: isRefundTransaction ? 0 : amountPayingNum,
        changeAmount: isRefundTransaction ? refundToCustomer : changeAmount,
      });
      dispatch(clearCart());

      if (isRefundTransaction) {
        toast.success(
          `Transaction completed! Pay ${formatCurrency(refundToCustomer)} to customer.`
        );
      } else if (isPartialPayment) {
        toast.success(
          `Sale completed! ${formatCurrency(creditAmount)} added to customer's credit.`
        );
      } else {
        toast.success("Sale completed successfully!");
      }

      // Close payment modal and show receipt
      onClose();
      setShowReceipt(true);
      onSuccess();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to complete sale";
      toast.error(errorMessage);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setSaleData(null);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Complete Payment"
        size="md"
      >
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-gray-600">
                Items ({regularItems.length}):
              </span>
              <span>{formatCurrency(regularSubtotal)}</span>
            </div>
            {returnItems.length > 0 && (
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-amber-600">
                  Returns ({returnItems.length}):
                </span>
                <span className="text-amber-600">
                  -{formatCurrency(returnsTotal)}
                </span>
              </div>
            )}
            {discount > 0 && (
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-600">Discount:</span>
                <span className="text-red-600">
                  -{formatCurrency(discount)}
                </span>
              </div>
            )}
            {tax > 0 && (
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-gray-600">Tax:</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-300 pt-2 text-lg font-bold">
              <span>
                {isRefundTransaction ? "Refund to Customer:" : "Total:"}
              </span>
              <span
                className={
                  isRefundTransaction ? "text-green-600" : "text-indigo-600"
                }
              >
                {isRefundTransaction
                  ? formatCurrency(refundToCustomer)
                  : formatCurrency(finalTotal)}
              </span>
            </div>
          </div>

          {/* Customer Selection */}
          <div>
            <SearchableSelect
              label={
                <span>
                  Customer{" "}
                  {isPartialPayment && <span className="text-red-500">*</span>}
                </span>
              }
              options={[
                { value: 0, label: "Walk-in Customer (No credit)" },
                ...customerOptions,
              ]}
              value={customerId || 0}
              onChange={(val) => {
                const id = Number(val);
                dispatch(setCustomer(id === 0 ? undefined : id));
              }}
              onSearch={setCustomerSearch}
              placeholder="Select or search customer..."
              searchPlaceholder="Type name or phone..."
            />
            <button
              type="button"
              onClick={() => setShowCustomerModal(true)}
              className="mt-1 text-xs text-indigo-600 hover:text-indigo-800"
            >
              + Add New Customer
            </button>
            {selectedCustomer && selectedCustomer.credit_balance > 0 && (
              <p className="mt-1 text-xs text-amber-600">
                This customer already owes{" "}
                {formatCurrency(selectedCustomer.credit_balance)}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <Select
            label="Payment Method"
            options={[
              { value: "cash", label: "Cash" },
              { value: "card", label: "Card" },
              { value: "digital", label: "Digital" },
            ]}
            value={paymentMethod}
            onChange={(e) =>
              setPaymentMethod(e.target.value as "cash" | "card" | "digital")
            }
          />

          {/* Amount Paying Now - Only show for positive totals */}
          {!isRefundTransaction && (
            <div>
              <Input
                label="Amount Paying Now"
                type="number"
                min="0"
                step="0.01"
                value={amountPaying}
                onChange={(e) => setAmountPaying(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setAmountPaying(finalTotal.toString())}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                >
                  Full Amount
                </button>
                <button
                  type="button"
                  onClick={() => setAmountPaying("0")}
                  className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                >
                  Full Credit
                </button>
              </div>
            </div>
          )}

          {/* Refund Info - Show when returns exceed purchases */}
          {isRefundTransaction && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-3">
              <div className="flex items-center gap-2">
                <svg
                  className="h-6 w-6 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-700">
                    Pay to Customer
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(refundToCustomer)}
                  </p>
                  <p className="text-xs text-green-600">
                    Returns exceed new purchases
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Change to Return - For overpayment on positive totals */}
          {isOverpayment && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-3">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-700">
                    Change to Return
                  </p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(changeAmount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Credit Info */}
          {isPartialPayment && (
            <div
              className={`rounded-lg border p-3 ${!customerId ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`h-5 w-5 ${!customerId ? "text-red-500" : "text-amber-500"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <p
                    className={`text-sm font-medium ${!customerId ? "text-red-700" : "text-amber-700"}`}
                  >
                    {isFullCredit ? "Full Credit Sale" : "Partial Payment"}
                  </p>
                  <p
                    className={`text-sm ${!customerId ? "text-red-600" : "text-amber-600"}`}
                  >
                    {formatCurrency(creditAmount)} will be added to
                    customer&apos;s credit
                  </p>
                </div>
              </div>
              {!customerId && (
                <p className="mt-2 text-xs font-medium text-red-600">
                  ⚠️ Please select a customer for credit sales
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={
                isLoading ||
                (isPartialPayment && !customerId && !isRefundTransaction)
              }
              className={
                isRefundTransaction ? "bg-green-600 hover:bg-green-700" : ""
              }
            >
              {isLoading
                ? "Processing..."
                : isRefundTransaction
                  ? `Complete & Pay ${formatCurrency(refundToCustomer)} to Customer`
                  : isPartialPayment
                    ? `Pay ${formatCurrency(amountPayingNum)} (${formatCurrency(creditAmount)} on credit)`
                    : "Complete Payment"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        title="Add New Customer"
      >
        <CustomerForm
          onCustomerCreated={(customer) => {
            refetchCustomers();
            dispatch(setCustomer(customer.id));
            setShowCustomerModal(false);
            toast.success(`${customer.name} created and selected`);
          }}
          onSuccess={() => {
            // Also close modal on success (for updates)
            setShowCustomerModal(false);
          }}
        />
      </Modal>

      {/* Receipt Modal */}
      {saleData && (
        <Modal
          isOpen={showReceipt}
          onClose={handleReceiptClose}
          title="Receipt"
          size="md"
        >
          <div className="no-print">
            <div className="mb-4 flex justify-end">
              <Button onClick={() => receiptRef.current?.print()}>
                Print Receipt
              </Button>
            </div>
          </div>
          <Receipt
            ref={receiptRef}
            sale={saleData.sale}
            items={saleData.items}
            returnItems={saleData.returnItemsForReceipt}
            amountPaid={saleData.amountPaid}
            changeAmount={saleData.changeAmount}
          />
        </Modal>
      )}
    </>
  );
}

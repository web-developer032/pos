"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  useCloseDayMutation,
  useGetDaySummaryQuery,
} from "@/lib/api/cashRegisterApi";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { handleMutationError } from "@/lib/utils/errorHandler";
import toast from "react-hot-toast";

interface CloseDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CloseDayFormData {
  closing_balance: string;
  notes: string;
}

export function CloseDayModal({ isOpen, onClose }: CloseDayModalProps) {
  const [closeDay, { isLoading }] = useCloseDayMutation();
  const { data: summary, isFetching } = useGetDaySummaryQuery(undefined, {
    skip: !isOpen,
    // Refetch when modal opens
    refetchOnMountOrArgChange: true,
  });
  const { format: formatCurrency } = useCurrency();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CloseDayFormData>({
    defaultValues: {
      closing_balance: "",
      notes: "",
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const closingBalance = watch("closing_balance");
  const expectedBalance = summary?.cash_summary?.expected_balance ?? 0;
  const variance = closingBalance
    ? parseFloat(closingBalance) - expectedBalance
    : 0;

  const onSubmit = async (data: CloseDayFormData) => {
    try {
      await closeDay({
        closing_balance: parseFloat(data.closing_balance) || 0,
        notes: data.notes || undefined,
      }).unwrap();

      toast.success("Day closed successfully");
      reset();
      onClose();
    } catch (error) {
      handleMutationError(error, "Failed to close day");
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getVarianceColor = (value: number): string => {
    if (Math.abs(value) < 0.01) return "text-green-600";
    if (value > 0) return "text-blue-600";
    return "text-red-600";
  };

  const getVarianceLabel = (value: number): string => {
    if (Math.abs(value) < 0.01) return "Balanced";
    if (value > 0) return "Over";
    return "Short";
  };

  const getVarianceBgClass = (value: number): string => {
    if (Math.abs(value) < 0.01)
      return "border border-green-200 bg-green-50";
    if (value > 0) return "border border-blue-200 bg-blue-50";
    return "border border-red-200 bg-red-50";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Close Day / End Shift"
      size="lg"
    >
      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Loading State */}
        {isFetching && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Day Summary */}
        {!isFetching && summary && (
          <div className="space-y-4">
            {/* Sales Summary */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 font-semibold text-gray-800">
                Sales Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-500">Transactions</p>
                  <p className="text-lg font-semibold">
                    {summary.sales.total.transaction_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Sales</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(summary.sales.total.total_amount)}
                  </p>
                </div>
                {summary.sales.by_method.map((method) => (
                  <div key={method.payment_method}>
                    <p className="text-xs capitalize text-gray-500">
                      {method.payment_method}
                    </p>
                    <p className="text-sm font-medium">
                      {formatCurrency(method.total_amount)} (
                      {method.transaction_count})
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Returns Summary */}
            {summary.returns.total.return_count > 0 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                <h3 className="mb-3 font-semibold text-gray-800">Returns</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Returns</p>
                    <p className="text-lg font-semibold">
                      {summary.returns.total.return_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Refund Amount</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {formatCurrency(summary.returns.total.total_refund)}
                    </p>
                  </div>
                  {summary.returns.by_method.map((method) => (
                    <div key={method.refund_method}>
                      <p className="text-xs capitalize text-gray-500">
                        {method.refund_method}
                      </p>
                      <p className="text-sm font-medium">
                        {formatCurrency(method.total_refund)} (
                        {method.return_count})
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expenses Summary */}
            {summary.expenses.total.expense_count > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <h3 className="mb-3 font-semibold text-gray-800">Expenses</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Expenses</p>
                    <p className="text-lg font-semibold">
                      {summary.expenses.total.expense_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-lg font-semibold text-red-600">
                      {formatCurrency(summary.expenses.total.total_amount)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cash Summary */}
            <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4">
              <h3 className="mb-3 font-semibold text-indigo-800">
                Cash Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Opening Balance</span>
                  <span className="font-medium">
                    {formatCurrency(summary.cash_summary.opening_balance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Cash Sales</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(summary.cash_summary.cash_sales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">- Cash Refunds</span>
                  <span className="font-medium text-orange-600">
                    {formatCurrency(summary.cash_summary.cash_refunds)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">- Cash Expenses</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(summary.cash_summary.cash_expenses)}
                  </span>
                </div>
                <div className="border-t border-indigo-300 pt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-indigo-800">Expected Balance</span>
                    <span className="text-indigo-600">
                      {formatCurrency(summary.cash_summary.expected_balance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Closing Balance Input */}
        <div className="space-y-2">
          <Input
            label="Actual Cash in Drawer *"
            type="number"
            step="0.01"
            min="0"
            placeholder="Count your cash and enter the amount"
            {...register("closing_balance", {
              required: "Closing balance is required",
              min: { value: 0, message: "Balance must be non-negative" },
            })}
            error={errors.closing_balance?.message}
          />

          {/* Variance Display */}
          {closingBalance && parseFloat(closingBalance) >= 0 && (
            <div className={`rounded-lg p-3 ${getVarianceBgClass(variance)}`}>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Variance:</span>
                <span className={`font-bold ${getVarianceColor(variance)}`}>
                  {variance >= 0 ? "+" : ""}
                  {formatCurrency(variance)} ({getVarianceLabel(variance)})
                </span>
              </div>
            </div>
          )}
        </div>

        <Input
          label="Notes (Optional)"
          {...register("notes")}
          placeholder="Notes about any discrepancies..."
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || isFetching}>
            {isLoading ? "Closing..." : "Close Day"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

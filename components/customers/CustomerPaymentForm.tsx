"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCustomerPaymentMutation } from "@/lib/api/customersApi";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import toast from "react-hot-toast";

const paymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  payment_method: z.enum(["cash", "card", "bank_transfer", "other"]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface CustomerPaymentFormProps {
  customerId: number;
  currentBalance: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CustomerPaymentForm({
  customerId,
  currentBalance,
  onSuccess,
  onCancel,
}: CustomerPaymentFormProps) {
  const { format: formatCurrency } = useCurrency();
  const [createPayment, { isLoading }] = useCreateCustomerPaymentMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: currentBalance,
      payment_method: "cash",
      reference_number: "",
      notes: "",
    },
  });

  const amountValue = watch("amount");

  // Quick amount buttons
  const quickAmounts = [
    { label: "Full", value: currentBalance },
    { label: "Half", value: Math.ceil(currentBalance / 2) },
    { label: "Quarter", value: Math.ceil(currentBalance / 4) },
  ];

  const onSubmit = async (data: PaymentFormData) => {
    if (data.amount > currentBalance) {
      toast.error(
        `Amount cannot exceed balance of ${formatCurrency(currentBalance)}`
      );
      return;
    }

    try {
      const result = await createPayment({
        customerId,
        data: {
          amount: data.amount,
          payment_method: data.payment_method,
          reference_number: data.reference_number || undefined,
          notes: data.notes || undefined,
        },
      }).unwrap();

      toast.success(result.message);
      onSuccess?.();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to record payment";
      toast.error(errorMessage);
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Current Balance Display */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-700">
          Outstanding Balance
        </p>
        <p className="text-2xl font-bold text-amber-800">
          {formatCurrency(currentBalance)}
        </p>
      </div>

      {/* Amount Input */}
      <div>
        <Input
          label="Payment Amount"
          type="number"
          step="0.01"
          min="0.01"
          max={currentBalance}
          {...register("amount", { valueAsNumber: true })}
          error={errors.amount?.message}
        />
        <div className="mt-2 flex gap-2">
          {quickAmounts.map((qa) => (
            <button
              key={qa.label}
              type="button"
              onClick={() => setValue("amount", qa.value)}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                amountValue === qa.value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {qa.label} ({formatCurrency(qa.value)})
            </button>
          ))}
        </div>
      </div>

      {/* Remaining after payment */}
      {amountValue > 0 && amountValue < currentBalance && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm text-gray-600">
            Remaining after payment:{" "}
            <span className="font-semibold text-gray-900">
              {formatCurrency(currentBalance - amountValue)}
            </span>
          </p>
        </div>
      )}

      {/* Payment Method */}
      <Select
        label="Payment Method"
        options={[
          { value: "cash", label: "Cash" },
          { value: "card", label: "Card" },
          { value: "bank_transfer", label: "Bank Transfer" },
          { value: "other", label: "Other" },
        ]}
        {...register("payment_method")}
        error={errors.payment_method?.message}
      />

      {/* Reference Number */}
      <Input
        label="Reference Number (Optional)"
        placeholder="Transaction ID, receipt number, etc."
        {...register("reference_number")}
        error={errors.reference_number?.message}
      />

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes (Optional)
        </label>
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          rows={2}
          placeholder="Any additional notes..."
          {...register("notes")}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? "Recording..."
            : `Record Payment of ${formatCurrency(amountValue || 0)}`}
        </Button>
      </div>
    </Form>
  );
}

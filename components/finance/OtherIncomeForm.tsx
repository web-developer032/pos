"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateOtherIncomeMutation,
  useUpdateOtherIncomeMutation,
  useGetOtherIncomeRecordQuery,
  CreateOtherIncomeRequest,
} from "@/lib/api/financeApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Form } from "@/components/ui/Form";
import { useScrollToError } from "@/lib/hooks/useScrollToError";
import toast from "react-hot-toast";

interface OtherIncomeFormProps {
  incomeId?: number;
  onSuccess: () => void;
}

const incomeCategories = [
  "Cardboard Sales",
  "Scrap Sales",
  "Commission",
  "Interest",
  "Rent Income",
  "Refunds Received",
  "Equipment Sales",
  "Service Charges",
  "Miscellaneous",
  "Other",
];

export function OtherIncomeForm({ incomeId, onSuccess }: OtherIncomeFormProps) {
  const { data: incomeData } = useGetOtherIncomeRecordQuery(incomeId!, {
    skip: !incomeId,
  });
  const [createOtherIncome, { isLoading: isCreating }] =
    useCreateOtherIncomeMutation();
  const [updateOtherIncome, { isLoading: isUpdating }] =
    useUpdateOtherIncomeMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateOtherIncomeRequest>({
    defaultValues: {
      payment_method: "cash",
    },
  });

  // Auto-scroll to first error on validation failure
  useScrollToError(errors);

  useEffect(() => {
    if (incomeData?.income) {
      reset({
        amount: incomeData.income.amount,
        category: incomeData.income.category,
        description: incomeData.income.description || "",
        payment_method: incomeData.income.payment_method,
        reference_number: incomeData.income.reference_number || "",
        notes: incomeData.income.notes || "",
      });
    }
  }, [incomeData, reset]);

  const onSubmit = async (data: CreateOtherIncomeRequest) => {
    try {
      if (incomeId) {
        await updateOtherIncome({ id: incomeId, data }).unwrap();
        toast.success("Income updated successfully");
      } else {
        await createOtherIncome(data).unwrap();
        toast.success("Income added successfully");
      }
      onSuccess();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to save income";
      toast.error(errorMessage);
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Category *"
        list="income-categories"
        {...register("category", {
          required: "Category is required",
        })}
        error={errors.category?.message}
        placeholder="Select or type a category"
      />
      <datalist id="income-categories">
        {incomeCategories.map((cat) => (
          <option key={cat} value={cat} />
        ))}
      </datalist>

      <Input
        label="Amount *"
        type="number"
        step="0.01"
        min="0.01"
        {...register("amount", {
          required: "Amount is required",
          min: { value: 0.01, message: "Amount must be greater than 0" },
          valueAsNumber: true,
        })}
        error={errors.amount?.message}
      />

      <Input
        label="Description"
        {...register("description")}
        placeholder="Brief description of the income source"
      />

      <Select
        label="Payment Method *"
        options={[
          { value: "cash", label: "Cash" },
          { value: "card", label: "Card" },
          { value: "bank_transfer", label: "Bank Transfer" },
          { value: "other", label: "Other" },
        ]}
        {...register("payment_method", {
          required: "Payment method is required",
        })}
        error={errors.payment_method?.message}
      />

      <Input
        label="Reference Number"
        {...register("reference_number")}
        placeholder="Receipt number, transaction ID, etc."
      />

      <Input
        label="Notes"
        {...register("notes")}
        placeholder="Additional notes (optional)"
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="submit"
          disabled={isCreating || isUpdating}
          className="bg-green-600 hover:bg-green-700"
        >
          {isCreating || isUpdating
            ? "Saving..."
            : incomeId
              ? "Update"
              : "Add Income"}
        </Button>
      </div>
    </Form>
  );
}


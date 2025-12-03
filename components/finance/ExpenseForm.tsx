"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useGetExpenseQuery,
  CreateExpenseRequest,
} from "@/lib/api/financeApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import toast from "react-hot-toast";

interface ExpenseFormProps {
  expenseId?: number;
  onSuccess: () => void;
}

const expenseCategories = [
  "Rent",
  "Utilities",
  "Salaries",
  "Marketing",
  "Office Supplies",
  "Equipment",
  "Maintenance",
  "Insurance",
  "Taxes",
  "Other",
];

export function ExpenseForm({ expenseId, onSuccess }: ExpenseFormProps) {
  const { data: expenseData } = useGetExpenseQuery(expenseId!, {
    skip: !expenseId,
  });
  const [createExpense, { isLoading: isCreating }] =
    useCreateExpenseMutation();
  const [updateExpense, { isLoading: isUpdating }] =
    useUpdateExpenseMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateExpenseRequest>({
    defaultValues: {
      payment_method: "cash",
    },
  });

  useEffect(() => {
    if (expenseData?.expense) {
      reset({
        amount: expenseData.expense.amount,
        category: expenseData.expense.category,
        description: expenseData.expense.description || "",
        payment_method: expenseData.expense.payment_method,
        reference_number: expenseData.expense.reference_number || "",
        notes: expenseData.expense.notes || "",
      });
    }
  }, [expenseData, reset]);

  const onSubmit = async (data: CreateExpenseRequest) => {
    try {
      if (expenseId) {
        await updateExpense({ id: expenseId, data }).unwrap();
        toast.success("Expense updated successfully");
      } else {
        await createExpense(data).unwrap();
        toast.success("Expense created successfully");
      }
      onSuccess();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to save expense";
      toast.error(errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Category *"
        list="categories"
        {...register("category", {
          required: "Category is required",
        })}
        error={errors.category?.message}
        placeholder="Select or type a category"
      />
      <datalist id="categories">
        {expenseCategories.map((cat) => (
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
        placeholder="Brief description of the expense"
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
        placeholder="Check number, transaction ID, etc."
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
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isCreating || isUpdating
            ? "Saving..."
            : expenseId
              ? "Update"
              : "Create"}
        </Button>
      </div>
    </form>
  );
}


"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateCapitalMutation,
  useUpdateCapitalMutation,
  useGetCapitalRecordQuery,
  CreateCapitalRequest,
} from "@/lib/api/financeApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Form } from "@/components/ui/Form";
import { useScrollToError } from "@/lib/hooks/useScrollToError";
import toast from "react-hot-toast";

interface CapitalFormProps {
  capitalId?: number;
  onSuccess: () => void;
}

export function CapitalForm({ capitalId, onSuccess }: CapitalFormProps) {
  const { data: capitalData } = useGetCapitalRecordQuery(capitalId!, {
    skip: !capitalId,
  });
  const [createCapital, { isLoading: isCreating }] =
    useCreateCapitalMutation();
  const [updateCapital, { isLoading: isUpdating }] =
    useUpdateCapitalMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCapitalRequest>({
    defaultValues: {
      transaction_type: "investment",
    },
  });

  // Auto-scroll to first error on validation failure
  useScrollToError(errors);

  useEffect(() => {
    if (capitalData?.capital) {
      reset({
        amount: capitalData.capital.amount,
        description: capitalData.capital.description || "",
        transaction_type: capitalData.capital.transaction_type,
        notes: capitalData.capital.notes || "",
      });
    }
  }, [capitalData, reset]);

  const onSubmit = async (data: CreateCapitalRequest) => {
    try {
      if (capitalId) {
        await updateCapital({ id: capitalId, data }).unwrap();
        toast.success("Capital record updated successfully");
      } else {
        await createCapital(data).unwrap();
        toast.success("Capital record created successfully");
      }
      onSuccess();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to save capital record";
      toast.error(errorMessage);
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Transaction Type *"
        options={[
          { value: "investment", label: "Investment" },
          { value: "withdrawal", label: "Withdrawal" },
        ]}
        {...register("transaction_type", {
          required: "Transaction type is required",
        })}
        error={errors.transaction_type?.message}
      />

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
        placeholder="Brief description of the transaction"
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
            : capitalId
              ? "Update"
              : "Create"}
        </Button>
      </div>
    </Form>
  );
}


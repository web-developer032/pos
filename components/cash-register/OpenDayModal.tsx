"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  useOpenDayMutation,
  useGetSessionHistoryQuery,
} from "@/lib/api/cashRegisterApi";
import { useAppSelector } from "@/lib/hooks";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { handleMutationError } from "@/lib/utils/errorHandler";
import toast from "react-hot-toast";

interface OpenDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OpenDayFormData {
  opening_balance: string;
  notes: string;
}

export function OpenDayModal({ isOpen, onClose }: OpenDayModalProps) {
  const [openDay, { isLoading }] = useOpenDayMutation();
  const user = useAppSelector((state) => state.auth.user);
  const { format: formatCurrency } = useCurrency();

  // Use RTK Query to get last closing balance
  const { data: historyData } = useGetSessionHistoryQuery(
    { page: 1, limit: 1 },
    { skip: !isOpen }
  );

  const lastSession = historyData?.sessions?.[0];
  const lastClosingBalance =
    lastSession?.status === "closed" ? lastSession.closing_balance : null;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<OpenDayFormData>({
    defaultValues: {
      opening_balance: "",
      notes: "",
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const handleUseLastBalance = () => {
    if (lastClosingBalance !== null) {
      setValue("opening_balance", lastClosingBalance.toString());
    }
  };

  const onSubmit = async (data: OpenDayFormData) => {
    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    try {
      await openDay({
        opening_balance: parseFloat(data.opening_balance) || 0,
        user_id: Number(user.id),
        notes: data.notes || undefined,
      }).unwrap();

      toast.success("Day opened successfully");
      reset();
      onClose();
    } catch (error) {
      handleMutationError(error, "Failed to open day");
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Open Day / Start Shift">
      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-blue-800">
              Enter the amount of cash currently in your drawer to start the
              day. This will be used to track your cash balance throughout the
              day.
            </p>
          </div>
        </div>

        <div>
          <Input
            label="Opening Cash Balance *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("opening_balance", {
              required: "Opening balance is required",
              min: { value: 0, message: "Balance must be non-negative" },
            })}
            error={errors.opening_balance?.message}
          />
          {lastClosingBalance !== null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Last closing balance: {formatCurrency(lastClosingBalance)}
              </span>
              <button
                type="button"
                onClick={handleUseLastBalance}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Use this amount
              </button>
            </div>
          )}
        </div>

        <Input
          label="Notes (Optional)"
          {...register("notes")}
          placeholder="Any notes about the opening..."
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Opening..." : "Open Day"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

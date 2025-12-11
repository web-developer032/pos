"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  useUpdateSessionMutation,
  CashRegisterSession,
} from "@/lib/api/cashRegisterApi";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { useCurrency } from "@/lib/hooks/useCurrency";
import { handleMutationError } from "@/lib/utils/errorHandler";
import toast from "react-hot-toast";

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CashRegisterSession | null;
}

interface EditSessionFormData {
  opening_balance: string;
  closing_balance: string;
  notes: string;
}

export function EditSessionModal({
  isOpen,
  onClose,
  session,
}: EditSessionModalProps) {
  const [updateSession, { isLoading }] = useUpdateSessionMutation();
  const { format: formatCurrency } = useCurrency();

  const isOpenSession = session?.status === "open";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditSessionFormData>({
    defaultValues: {
      opening_balance: "",
      closing_balance: "",
      notes: "",
    },
  });

  // Reset form with session data when modal opens
  useEffect(() => {
    if (isOpen && session) {
      reset({
        opening_balance: session.opening_balance.toString(),
        closing_balance: session.closing_balance?.toString() || "",
        notes: session.notes || "",
      });
    }
  }, [isOpen, session, reset]);

  const onSubmit = async (data: EditSessionFormData) => {
    if (!session) return;

    try {
      const updateData: {
        id: number;
        opening_balance?: number;
        closing_balance?: number;
        notes?: string;
      } = { id: session.id };

      // Only include changed fields
      const newOpeningBalance = parseFloat(data.opening_balance);
      if (
        !isNaN(newOpeningBalance) &&
        newOpeningBalance !== session.opening_balance
      ) {
        updateData.opening_balance = newOpeningBalance;
      }

      if (!isOpenSession) {
        const newClosingBalance = parseFloat(data.closing_balance);
        if (
          !isNaN(newClosingBalance) &&
          newClosingBalance !== session.closing_balance
        ) {
          updateData.closing_balance = newClosingBalance;
        }
      }

      if (data.notes !== session.notes) {
        updateData.notes = data.notes;
      }

      // Check if there are any changes
      if (Object.keys(updateData).length === 1) {
        toast.error("No changes detected");
        return;
      }

      await updateSession(updateData).unwrap();
      toast.success("Session updated successfully");
      onClose();
    } catch (error) {
      handleMutationError(error, "Failed to update session");
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!session) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isOpenSession ? "Edit Current Session" : "Edit Session"}
    >
      <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Info Banner */}
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
              {isOpenSession
                ? "Edit the opening balance for the current session. Expected balance will be recalculated."
                : "Edit the opening and closing balances. Expected balance and variance will be recalculated."}
            </p>
          </div>
        </div>

        {/* Opening Balance */}
        <div>
          <Input
            label="Opening Balance *"
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
          <p className="mt-1 text-xs text-gray-500">
            Original: {formatCurrency(session.opening_balance)}
          </p>
        </div>

        {/* Closing Balance - Only for closed sessions */}
        {!isOpenSession && (
          <div>
            <Input
              label="Closing Balance *"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("closing_balance", {
                required: "Closing balance is required",
                min: { value: 0, message: "Balance must be non-negative" },
              })}
              error={errors.closing_balance?.message}
            />
            <p className="mt-1 text-xs text-gray-500">
              Original: {formatCurrency(session.closing_balance || 0)}
            </p>
          </div>
        )}

        {/* Current Expected & Variance (for closed sessions) */}
        {!isOpenSession && session.expected_balance !== null && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Expected Balance</p>
                <p className="font-semibold">
                  {formatCurrency(session.expected_balance)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Current Variance</p>
                <p
                  className={`font-semibold ${
                    session.variance !== null
                      ? Math.abs(session.variance) < 0.01
                        ? "text-green-600"
                        : session.variance > 0
                          ? "text-blue-600"
                          : "text-red-600"
                      : ""
                  }`}
                >
                  {session.variance !== null
                    ? `${session.variance >= 0 ? "+" : ""}${formatCurrency(session.variance)}`
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <Input
          label="Notes (Optional)"
          {...register("notes")}
          placeholder="Add or update notes..."
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}

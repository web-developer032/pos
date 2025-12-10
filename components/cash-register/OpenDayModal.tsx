"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useOpenDayMutation } from "@/lib/api/cashRegisterApi";
import { useAppSelector } from "@/lib/hooks";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { useScrollToError } from "@/lib/hooks/useScrollToError";
import { useCurrency } from "@/lib/hooks/useCurrency";
import toast from "react-hot-toast";

interface OpenDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface OpenDayFormData {
  opening_balance: string;
  notes: string;
}

export function OpenDayModal({
  isOpen,
  onClose,
  onSuccess,
}: OpenDayModalProps) {
  const [openDay, { isLoading }] = useOpenDayMutation();
  const user = useAppSelector((state) => state.auth.user);
  const { format: formatCurrency } = useCurrency();
  const [lastClosingBalance, setLastClosingBalance] = useState<number | null>(
    null
  );
  const [hasFetchedBalance, setHasFetchedBalance] = useState(false);

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

  // Auto-scroll to first error on validation failure
  useScrollToError(errors);

  // Fetch last closing balance when modal opens
  useEffect(() => {
    if (isOpen && !hasFetchedBalance) {
      const fetchLastClosingBalance = async () => {
        try {
          const response = await fetch("/api/cash-register/history?limit=1");
          const data = await response.json();
          if (data.sessions && data.sessions.length > 0) {
            const lastSession = data.sessions[0];
            if (
              lastSession.status === "closed" &&
              lastSession.closing_balance !== null
            ) {
              setLastClosingBalance(lastSession.closing_balance);
            }
          }
        } catch (error) {
          console.error("Failed to fetch last closing balance:", error);
        }
        setHasFetchedBalance(true);
      };
      fetchLastClosingBalance();
    }

    // Reset fetch state when modal closes
    if (!isOpen) {
      setHasFetchedBalance(false);
      setLastClosingBalance(null);
    }
  }, [isOpen, hasFetchedBalance]);

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
        user_id: user.id,
        notes: data.notes || undefined,
      }).unwrap();

      toast.success("Day opened successfully");
      reset();
      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to open day";
      toast.error(errorMessage);
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
            <div>
              <p className="text-sm text-blue-800">
                Enter the amount of cash currently in your drawer to start the
                day. This will be used to track your cash balance throughout the
                day.
              </p>
            </div>
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

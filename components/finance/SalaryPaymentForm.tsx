"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateSalaryPaymentMutation,
  useUpdateSalaryPaymentMutation,
  useGetSalaryPaymentQuery,
  useGetEmployeesQuery,
  CreateSalaryPaymentRequest,
} from "@/lib/api/financeApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Form } from "@/components/ui/Form";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useScrollToError } from "@/lib/hooks/useScrollToError";
import { useCurrency } from "@/lib/hooks/useCurrency";
import toast from "react-hot-toast";
import { format } from "date-fns";

interface SalaryPaymentFormProps {
  paymentId?: number;
  preselectedEmployeeId?: number;
  onSuccess: () => void;
}

export function SalaryPaymentForm({
  paymentId,
  preselectedEmployeeId,
  onSuccess,
}: SalaryPaymentFormProps) {
  const { data: paymentData } = useGetSalaryPaymentQuery(paymentId!, {
    skip: !paymentId,
  });
  const { data: employeesData } = useGetEmployeesQuery({ status: "active" });
  const [createPayment, { isLoading: isCreating }] = useCreateSalaryPaymentMutation();
  const [updatePayment, { isLoading: isUpdating }] = useUpdateSalaryPaymentMutation();
  const { format: formatCurrency } = useCurrency();

  const currentPeriod = format(new Date(), "MMM yyyy");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateSalaryPaymentRequest>({
    defaultValues: {
      payment_type: "salary",
      payment_method: "cash",
      period: currentPeriod,
      employee_id: preselectedEmployeeId || 0,
    },
  });

  const selectedEmployeeId = watch("employee_id");
  const paymentType = watch("payment_type");
  const daysWorked = watch("days_worked");

  // Find selected employee
  const selectedEmployee = useMemo(() => {
    return employeesData?.employees.find((e) => e.id === selectedEmployeeId);
  }, [employeesData, selectedEmployeeId]);

  // Calculate suggested amount for daily workers
  const suggestedAmount = useMemo(() => {
    if (selectedEmployee?.salary_type === "daily" && daysWorked) {
      return selectedEmployee.base_salary * daysWorked;
    }
    if (selectedEmployee?.salary_type === "monthly" && paymentType === "salary") {
      return selectedEmployee.base_salary;
    }
    return 0;
  }, [selectedEmployee, daysWorked, paymentType]);

  useScrollToError(errors);

  useEffect(() => {
    if (paymentData?.payment) {
      const p = paymentData.payment;
      reset({
        employee_id: p.employee_id,
        amount: p.amount,
        payment_type: p.payment_type,
        period: p.period,
        days_worked: p.days_worked || undefined,
        payment_method: p.payment_method,
        notes: p.notes || "",
      });
    }
  }, [paymentData, reset]);

  // Set preselected employee
  useEffect(() => {
    if (preselectedEmployeeId && !paymentId) {
      setValue("employee_id", preselectedEmployeeId);
    }
  }, [preselectedEmployeeId, paymentId, setValue]);

  const employeeOptions = useMemo(() => {
    return (
      employeesData?.employees.map((emp) => ({
        value: emp.id,
        label: `${emp.name} (${emp.salary_type === "monthly" ? formatCurrency(emp.base_salary) + "/mo" : formatCurrency(emp.base_salary) + "/day"})`,
      })) || []
    );
  }, [employeesData, formatCurrency]);

  const onSubmit = async (data: CreateSalaryPaymentRequest) => {
    if (!data.employee_id) {
      toast.error("Please select an employee");
      return;
    }

    try {
      if (paymentId) {
        await updatePayment({ id: paymentId, data }).unwrap();
        toast.success("Payment updated successfully");
      } else {
        await createPayment(data).unwrap();
        toast.success("Payment recorded successfully");
      }
      onSuccess();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to save payment";
      toast.error(errorMessage);
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Employee *
        </label>
        <SearchableSelect
          options={employeeOptions}
          value={selectedEmployeeId || null}
          onChange={(value) => setValue("employee_id", value as number)}
          placeholder="Select employee..."
          disabled={!!paymentId}
        />
        {selectedEmployee && (
          <p className="mt-1 text-xs text-gray-500">
            {selectedEmployee.salary_type === "monthly"
              ? `Monthly salary: ${formatCurrency(selectedEmployee.base_salary)}`
              : `Daily rate: ${formatCurrency(selectedEmployee.base_salary)}/day`}
          </p>
        )}
      </div>

      <Select
        label="Payment Type *"
        options={[
          { value: "salary", label: "Salary" },
          { value: "advance", label: "Advance" },
          { value: "bonus", label: "Bonus" },
          { value: "deduction", label: "Deduction" },
        ]}
        {...register("payment_type", {
          required: "Payment type is required",
        })}
        error={errors.payment_type?.message}
      />

      <Input
        label="Period *"
        {...register("period", {
          required: "Period is required",
        })}
        error={errors.period?.message}
        placeholder="e.g., Dec 2024"
      />

      {selectedEmployee?.salary_type === "daily" && (
        <Input
          label="Days Worked"
          type="number"
          min="0"
          step="1"
          {...register("days_worked", {
            valueAsNumber: true,
          })}
          placeholder="Number of days worked"
        />
      )}

      <div>
        <Input
          label="Amount *"
          type="number"
          step="0.01"
          min="0.01"
          {...register("amount", {
            required: "Amount is required",
            min: { value: 0.01, message: "Amount must be > 0" },
            valueAsNumber: true,
          })}
          error={errors.amount?.message}
        />
        {suggestedAmount > 0 && paymentType === "salary" && (
          <button
            type="button"
            onClick={() => setValue("amount", suggestedAmount)}
            className="mt-1 text-xs text-indigo-600 hover:text-indigo-800"
          >
            Use suggested: {formatCurrency(suggestedAmount)}
          </button>
        )}
      </div>

      <Select
        label="Payment Method *"
        options={[
          { value: "cash", label: "Cash" },
          { value: "bank_transfer", label: "Bank Transfer" },
          { value: "check", label: "Check" },
          { value: "other", label: "Other" },
        ]}
        {...register("payment_method", {
          required: "Payment method is required",
        })}
        error={errors.payment_method?.message}
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
            : paymentId
              ? "Update"
              : "Record Payment"}
        </Button>
      </div>
    </Form>
  );
}

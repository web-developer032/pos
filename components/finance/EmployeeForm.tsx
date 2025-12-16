"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useGetEmployeeQuery,
  CreateEmployeeRequest,
} from "@/lib/api/financeApi";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Form } from "@/components/ui/Form";
import { useScrollToError } from "@/lib/hooks/useScrollToError";
import toast from "react-hot-toast";

interface EmployeeFormProps {
  employeeId?: number;
  onSuccess: () => void;
}

export function EmployeeForm({ employeeId, onSuccess }: EmployeeFormProps) {
  const { data: employeeData } = useGetEmployeeQuery(employeeId!, {
    skip: !employeeId,
  });
  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateEmployeeRequest>({
    defaultValues: {
      salary_type: "monthly",
      status: "active",
      base_salary: 0,
    },
  });

  const salaryType = watch("salary_type");

  useScrollToError(errors);

  useEffect(() => {
    if (employeeData?.employee) {
      const emp = employeeData.employee;
      reset({
        name: emp.name,
        phone: emp.phone || "",
        address: emp.address || "",
        salary_type: emp.salary_type,
        base_salary: emp.base_salary,
        join_date: emp.join_date || "",
        status: emp.status,
        notes: emp.notes || "",
      });
    }
  }, [employeeData, reset]);

  const onSubmit = async (data: CreateEmployeeRequest) => {
    try {
      if (employeeId) {
        await updateEmployee({ id: employeeId, data }).unwrap();
        toast.success("Employee updated successfully");
      } else {
        await createEmployee(data).unwrap();
        toast.success("Employee added successfully");
      }
      onSuccess();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to save employee";
      toast.error(errorMessage);
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Name *"
        {...register("name", {
          required: "Name is required",
        })}
        error={errors.name?.message}
        placeholder="Employee full name"
      />

      <Input
        label="Phone"
        {...register("phone")}
        placeholder="Phone number"
      />

      <Input
        label="Address"
        {...register("address")}
        placeholder="Address"
      />

      <Select
        label="Salary Type *"
        options={[
          { value: "monthly", label: "Monthly Salary" },
          { value: "daily", label: "Daily Wage" },
        ]}
        {...register("salary_type", {
          required: "Salary type is required",
        })}
        error={errors.salary_type?.message}
      />

      <Input
        label={salaryType === "monthly" ? "Monthly Salary *" : "Daily Rate *"}
        type="number"
        step="0.01"
        min="0"
        {...register("base_salary", {
          required: "Salary/Rate is required",
          min: { value: 0, message: "Must be >= 0" },
          valueAsNumber: true,
        })}
        error={errors.base_salary?.message}
        placeholder={salaryType === "monthly" ? "Monthly salary amount" : "Daily wage rate"}
      />

      <Input
        label="Join Date"
        type="date"
        {...register("join_date")}
      />

      {employeeId && (
        <Select
          label="Status"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          {...register("status")}
        />
      )}

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
            : employeeId
              ? "Update"
              : "Add Employee"}
        </Button>
      </div>
    </Form>
  );
}

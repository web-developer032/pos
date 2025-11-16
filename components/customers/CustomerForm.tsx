"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useGetCustomerQuery,
} from "@/lib/api/customersApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  loyalty_points: z.number().int().min(0).optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customerId?: number | null;
  onSuccess?: () => void;
}

export function CustomerForm({ customerId, onSuccess }: CustomerFormProps) {
  const { data: customerData } = useGetCustomerQuery(customerId!, {
    skip: !customerId,
  });
  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  useEffect(() => {
    if (customerData?.customer) {
      reset({
        name: customerData.customer.name,
        email: customerData.customer.email || "",
        phone: customerData.customer.phone || "",
        address: customerData.customer.address || "",
        loyalty_points: customerData.customer.loyalty_points,
      });
    }
  }, [customerData, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      if (customerId) {
        await updateCustomer({ id: customerId, data }).unwrap();
        toast.success("Customer updated successfully");
      } else {
        await createCustomer(data).unwrap();
        toast.success("Customer created successfully");
      }
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to save customer");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Name *"
        {...register("name")}
        error={errors.name?.message}
      />
      <Input
        label="Email"
        type="email"
        {...register("email")}
        error={errors.email?.message}
      />
      <Input
        label="Phone"
        {...register("phone")}
        error={errors.phone?.message}
      />
      <Input
        label="Address"
        {...register("address")}
        error={errors.address?.message}
      />
      {customerId && (
        <Input
          label="Loyalty Points"
          type="number"
          {...register("loyalty_points", { valueAsNumber: true })}
          error={errors.loyalty_points?.message}
        />
      )}
      <div className="flex justify-end space-x-2">
        <Button type="submit">{customerId ? "Update" : "Create"}</Button>
      </div>
    </form>
  );
}


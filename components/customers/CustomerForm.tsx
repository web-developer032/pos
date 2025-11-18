"use client";

import { useEffect, useState } from "react";
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
  email: z.email("Invalid email format").optional().or(z.literal("")),
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
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      loyalty_points: 0,
    },
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
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);

    try {
      const submitData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        loyalty_points: data.loyalty_points || undefined,
      };

      if (customerId) {
        await updateCustomer({ id: customerId, data: submitData }).unwrap();
        toast.success("Customer updated successfully");
      } else {
        await createCustomer(submitData).unwrap();
        toast.success("Customer created successfully");
      }
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to save customer");
    } finally {
      setIsSubmitting(false);
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : customerId ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

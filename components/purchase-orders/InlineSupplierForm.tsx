"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useCreateSupplierMutation } from "@/lib/api/suppliersApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { useScrollToError } from "@/lib/hooks/useScrollToError";
import toast from "react-hot-toast";

interface SupplierFormData {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface InlineSupplierFormProps {
  onSuccess: (supplierId: number) => void;
}

export function InlineSupplierForm({ onSuccess }: InlineSupplierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormData>({
    defaultValues: {
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  // Auto-scroll to first error on validation failure
  useScrollToError(errors);

  const [createSupplier] = useCreateSupplierMutation();

  const onSubmit = async (data: SupplierFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createSupplier({
        name: data.name,
        contact_person: data.contact_person || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
      }).unwrap();
      onSuccess(result.supplier.id);
    } catch (error: unknown) {
      const err = error as { data?: { error?: string } };
      toast.error(err.data?.error || "Failed to create supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Name *"
        {...register("name", { required: "Name is required" })}
        error={errors.name?.message}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Contact Person"
          {...register("contact_person")}
          error={errors.contact_person?.message}
        />
        <Input
          label="Phone"
          {...register("phone")}
          error={errors.phone?.message}
        />
      </div>
      <Input
        label="Email"
        type="email"
        {...register("email")}
        error={errors.email?.message}
      />
      <Input
        label="Address"
        {...register("address")}
        error={errors.address?.message}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Supplier"}
        </Button>
      </div>
    </Form>
  );
}


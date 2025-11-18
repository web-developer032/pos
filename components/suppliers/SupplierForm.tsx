"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useGetSupplierQuery,
} from "@/lib/api/suppliersApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contact_person: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  supplierId?: number | null;
  onSuccess?: () => void;
}

export function SupplierForm({ supplierId, onSuccess }: SupplierFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: supplierData } = useGetSupplierQuery(supplierId!, {
    skip: !supplierId,
  });
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  useEffect(() => {
    if (supplierData?.supplier) {
      reset({
        name: supplierData.supplier.name,
        contact_person: supplierData.supplier.contact_person || "",
        email: supplierData.supplier.email || "",
        phone: supplierData.supplier.phone || "",
        address: supplierData.supplier.address || "",
      });
    }
  }, [supplierData, reset]);

  const onSubmit = async (data: SupplierFormData) => {
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);

    try {
      const submitData = {
        name: data.name,
        contact_person: data.contact_person || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
      };

      if (supplierId) {
        await updateSupplier({ id: supplierId, data: submitData }).unwrap();
        toast.success("Supplier updated successfully");
      } else {
        await createSupplier(submitData).unwrap();
        toast.success("Supplier created successfully");
      }
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to save supplier");
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
        label="Contact Person"
        {...register("contact_person")}
        error={errors.contact_person?.message}
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
      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : supplierId ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

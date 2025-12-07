"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from "@/lib/api/settingsApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export default function PrintSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "manager"]}>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Print Settings</h1>
          <p className="mt-2 text-gray-600">
            Configure receipt information and appearance
          </p>
        </div>
        <ReceiptSettingsForm />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function ReceiptSettingsForm() {
  const { data, isLoading } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    receipt_store_name: "",
    receipt_address: "",
    receipt_phone: "",
    receipt_phone2: "",
    receipt_operating_hours: "",
    receipt_terms: "",
    receipt_logo: "",
  });

  useEffect(() => {
    if (data?.settings) {
      const settings = data.settings;
      setFormData({
        receipt_store_name: settings.receipt_store_name || "",
        receipt_address: settings.receipt_address || "",
        receipt_phone: settings.receipt_phone || "",
        receipt_phone2: settings.receipt_phone2 || "",
        receipt_operating_hours: settings.receipt_operating_hours || "",
        receipt_terms: settings.receipt_terms || "",
        receipt_logo: settings.receipt_logo || "",
      });
      if (settings.receipt_logo) {
        setLogoPreview(settings.receipt_logo);
      }
    }
  }, [data]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        setFormData({ ...formData, receipt_logo: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData({ ...formData, receipt_logo: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({ settings: formData }).unwrap();
      toast.success("Print settings updated successfully");
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to update print settings";
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Form
      onSubmit={handleSubmit}
      className="max-w-4xl space-y-6 rounded-lg bg-white p-6 shadow"
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Store Information */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Store Information</h2>

          <Input
            label="Store Name"
            value={formData.receipt_store_name}
            onChange={(e) =>
              setFormData({ ...formData, receipt_store_name: e.target.value })
            }
            placeholder="Abbas Store"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Address
            </label>
            <textarea
              value={formData.receipt_address}
              onChange={(e) =>
                setFormData({ ...formData, receipt_address: e.target.value })
              }
              placeholder="Cannal Bridge, Bangla Road, Haroonabad"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <Input
            label="Phone Number"
            value={formData.receipt_phone}
            onChange={(e) =>
              setFormData({ ...formData, receipt_phone: e.target.value })
            }
            placeholder="063-2301697"
          />

          <Input
            label="Phone Number 2 (Optional)"
            value={formData.receipt_phone2}
            onChange={(e) =>
              setFormData({ ...formData, receipt_phone2: e.target.value })
            }
            placeholder="0300-1626510"
          />

          <Input
            label="Operating Hours"
            value={formData.receipt_operating_hours}
            onChange={(e) =>
              setFormData({
                ...formData,
                receipt_operating_hours: e.target.value,
              })
            }
            placeholder="Open 7 days/week (06:00 AM - 11:45 PM)"
          />
        </div>

        {/* Logo and Terms */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Logo & Terms</h2>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Store Logo
            </label>
            {logoPreview ? (
              <div className="space-y-2">
                <div className="relative inline-block">
                  <img
                    src={logoPreview}
                    alt="Store logo"
                    className="h-32 w-auto rounded border border-gray-300 object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Logo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveLogo}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Logo
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
            <p className="mt-1 text-xs text-gray-500">
              Recommended: PNG or JPG, max 500KB
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Terms & Conditions
            </label>
            <textarea
              value={formData.receipt_terms}
              onChange={(e) =>
                setFormData({ ...formData, receipt_terms: e.target.value })
              }
              placeholder="Enter terms and conditions (one per line)"
              rows={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Each line will be displayed as a separate bullet point on the
              receipt
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <Button type="submit">Save Print Settings</Button>
      </div>
    </Form>
  );
}

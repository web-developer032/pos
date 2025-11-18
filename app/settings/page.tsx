"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from "@/lib/api/settingsApi";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "manager"]}>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <SettingsForm />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function SettingsForm() {
  const { data, isLoading } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();
  const [formData, setFormData] = useState({
    store_name: "",
    tax_rate: "",
    currency: "",
    currency_symbol: "",
  });

  useEffect(() => {
    if (data?.settings) {
      setFormData({
        store_name: data.settings.store_name || "",
        tax_rate: data.settings.tax_rate || "",
        currency: data.settings.currency || "",
        currency_symbol: data.settings.currency_symbol || "",
      });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings({ settings: formData }).unwrap();
      toast.success("Settings updated successfully");
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to update settings");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-lg bg-white p-6 shadow"
    >
      <Input
        label="Store Name"
        value={formData.store_name}
        onChange={(e) =>
          setFormData({ ...formData, store_name: e.target.value })
        }
      />
      <Input
        label="Tax Rate (%)"
        type="number"
        step="0.1"
        value={formData.tax_rate}
        onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
      />
      <Input
        label="Currency"
        value={formData.currency}
        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
      />
      <Input
        label="Currency Symbol"
        value={formData.currency_symbol}
        onChange={(e) =>
          setFormData({ ...formData, currency_symbol: e.target.value })
        }
      />
      <Button type="submit">Save Settings</Button>
    </form>
  );
}

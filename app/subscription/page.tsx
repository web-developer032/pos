"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/Button";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { setCredentials } from "@/lib/slices/authSlice";
import toast from "react-hot-toast";

const PLANS = [
  { value: "basic", label: "Basic" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
] as const;

const INTERVALS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "lifetime", label: "Lifetime" },
] as const;

interface SubscriptionData {
  id: number;
  plan: string;
  interval: string;
  status: string;
  expiresAt: string | null;
}

export default function SubscriptionPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plan, setPlan] = useState<string>("basic");
  const [interval, setInterval] = useState<string>("monthly");

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch("/api/users/me/subscription", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setSubscription(data.subscription ?? null);
          if (data.subscription) {
            setPlan(data.subscription.plan);
            setInterval(data.subscription.interval);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSubscription();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users/me/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan, interval }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Update failed");
      }
      const data = await res.json();
      setSubscription(data.subscription ?? null);
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      if (meRes.ok) {
        const meData = await meRes.json();
        dispatch(setCredentials({ user: meData.user, token: "" }));
      }
      toast.success("Subscription updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold">Subscription</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and change your plan. Changes take effect immediately (no payment in this demo).
          </p>

          {loading ? (
            <p className="mt-4">Loading...</p>
          ) : (
            <div className="mt-6 space-y-6">
              {user && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h2 className="text-sm font-medium text-gray-700">Current (from session)</h2>
                  <p className="mt-1 text-sm">
                    Plan: <span className="font-medium">{user.plan ?? "—"}</span>
                    {" · "}
                    Interval: <span className="font-medium">{user.subscriptionInterval ?? "—"}</span>
                    {" · "}
                    Status: <span className="font-medium">{user.subscriptionStatus ?? "—"}</span>
                  </p>
                </div>
              )}

              {subscription ? (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h2 className="text-sm font-medium text-gray-700">Active subscription</h2>
                  <p className="mt-1 text-sm">
                    Plan: {subscription.plan} · Interval: {subscription.interval} · Status:{" "}
                    {subscription.status}
                    {subscription.expiresAt && (
                      <> · Expires: {new Date(subscription.expiresAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-amber-600">No active subscription. Select a plan below.</p>
              )}

              <form onSubmit={handleUpdate} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-medium text-gray-700">Change plan</h2>
                <div>
                  <label className="block text-sm text-gray-600">Plan</label>
                  <select
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                  >
                    {PLANS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Billing interval</label>
                  <select
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                  >
                    {INTERVALS.map((i) => (
                      <option key={i.value} value={i.value}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Updating..." : "Update subscription"}
                </Button>
              </form>

              <p className="text-sm text-gray-500">
                Your session is refreshed automatically after updating; the sidebar will reflect your new plan.
              </p>
            </div>
          )}

          <p className="mt-6">
            <Link href="/dashboard" className="text-indigo-600 hover:underline">
              Back to dashboard
            </Link>
          </p>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

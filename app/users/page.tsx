"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  useGetUsersQuery,
  useDeleteAllUsersMutation,
} from "@/lib/api/usersApi";
import type { User } from "@/lib/api/usersApi";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Users</h1>
        </div>
        <UsersList />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

const PLANS = ["basic", "pro", "enterprise"] as const;
const INTERVALS = ["weekly", "monthly", "lifetime"] as const;

function UsersList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const { data, isLoading, refetch } = useGetUsersQuery({ page, limit });
  const [deleteAllUsers] = useDeleteAllUsersMutation();
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editPlan, setEditPlan] = useState<string>("basic");
  const [editInterval, setEditInterval] = useState<string>("monthly");
  const [saving, setSaving] = useState(false);

  const handleDeleteAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL non-admin users? This action cannot be undone!"
      )
    ) {
      return;
    }
    setIsDeletingAll(true);
    try {
      await deleteAllUsers().unwrap();
      toast.success("All non-admin users deleted successfully");
      refetch();
    } catch (error) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        "Failed to delete all users";
      toast.error(errorMessage);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const openEditSubscription = (user: User) => {
    const sub = user.subscription;
    setEditUser(user);
    setEditPlan(sub?.plan ?? "basic");
    setEditInterval(sub?.interval ?? "monthly");
  };

  const handleSaveSubscription = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: editPlan, interval: editInterval }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Update failed");
      }
      toast.success("Subscription updated");
      setEditUser(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          variant="outline"
          onClick={handleDeleteAll}
          disabled={isDeletingAll || (data?.users.length || 0) === 0}
          className="text-red-600 hover:text-red-700"
        >
          {isDeletingAll ? "Deleting..." : "Delete All (Non-Admin)"}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 text-sm font-medium">
                  {user.username}
                </td>
                <td className="px-6 py-4 text-sm">{user.email}</td>
                <td className="px-6 py-4 text-sm capitalize">{user.role}</td>
                <td className="px-6 py-4 text-sm">
                  {user.subscription?.plan ?? "—"}
                </td>
                <td className="px-6 py-4 text-sm">
                  {user.subscription
                    ? `${user.subscription.interval} · ${user.subscription.status}`
                    : "—"}
                  {user.subscription?.expires_at && (
                    <span className="block text-gray-500">
                      Expires {format(new Date(user.subscription.expires_at), "MMM dd, yyyy")}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  {user.created_at &&
                    format(new Date(user.created_at), "MMM dd, yyyy")}
                </td>
                <td className="px-6 py-4 text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditSubscription(user)}
                  >
                    Edit subscription
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.pagination && (
        <div className="mt-4">
          <Pagination
            currentPage={data.pagination.page}
            totalPages={data.pagination.totalPages}
            totalItems={data.pagination.total}
            itemsPerPage={data.pagination.limit}
            onPageChange={(newPage) => {
              setPage(newPage);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onItemsPerPageChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      )}

      <Modal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title={editUser ? `Edit subscription: ${editUser.username}` : ""}
      >
        {editUser && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Plan</label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Interval</label>
              <select
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={editInterval}
                onChange={(e) => setEditInterval(e.target.value)}
              >
                {INTERVALS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSubscription} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

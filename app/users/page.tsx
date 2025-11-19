"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetUsersQuery, useDeleteAllUsersMutation } from "@/lib/api/usersApi";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function UsersPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-3xl font-bold ">Users</h1>
        </div>
        <UsersList />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function UsersList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const { data, isLoading, refetch } = useGetUsersQuery({ page, limit });
  const [deleteAllUsers] = useDeleteAllUsersMutation();
  const [isDeletingAll, setIsDeletingAll] = useState(false);

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
    } catch (error: any) {
      toast.error(error.data?.error || "Failed to delete all users");
    } finally {
      setIsDeletingAll(false);
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
      <div className="overflow-hidden rounded-lg bg-white shadow">
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
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white ">
          {data?.users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 text-sm font-medium">{user.username}</td>
              <td className="px-6 py-4 text-sm">{user.email}</td>
              <td className="px-6 py-4 text-sm capitalize">{user.role}</td>
              <td className="px-6 py-4 text-sm">
                {user.created_at &&
                  format(new Date(user.created_at), "MMM dd, yyyy")}
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
    </div>
  );
}

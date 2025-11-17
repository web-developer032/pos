"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useGetUsersQuery } from "@/lib/api/usersApi";
import { format } from "date-fns";

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
  const { data, isLoading } = useGetUsersQuery();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
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
  );
}

"use client";

import Link from "next/link";
import { useAppSelector } from "@/lib/hooks";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Toaster } from "react-hot-toast";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAppSelector((state) => state.auth);
  const showNoPlanBanner =
    user &&
    user.role !== "admin" &&
    (user.plan == null || (user.features && user.features.length === 0));

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        {showNoPlanBanner && (
          <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-800">
            You don&apos;t have an active plan.{" "}
            <Link
              href="/subscription"
              className="font-medium underline hover:text-amber-900"
            >
              Go to Subscription
            </Link>{" "}
            to choose one.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

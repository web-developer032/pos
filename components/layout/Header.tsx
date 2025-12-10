"use client";

import Link from "next/link";
import { useAppSelector } from "@/lib/hooks";
import { useGetCurrentSessionQuery } from "@/lib/api/cashRegisterApi";

export function Header() {
  const { user } = useAppSelector((state) => state.auth);
  const { data: sessionData } = useGetCurrentSessionQuery();

  const isOpen = sessionData?.isOpen || false;

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 sm:text-xl">
            Welcome, {user?.username}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {/* Day Status Indicator */}
          <Link
            href="/cash-register"
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              isOpen
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isOpen ? "bg-green-500 animate-pulse" : "bg-gray-400"
              }`}
            ></span>
            {isOpen ? "Day Open" : "Day Closed"}
          </Link>
          <span className="text-xs capitalize text-gray-600 sm:text-sm">
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  );
}

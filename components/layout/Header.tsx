"use client";

import { useAppSelector } from "@/lib/hooks";

export function Header() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 sm:text-xl">
            Welcome, {user?.username}
          </h2>
        </div>
        <div className="flex items-center">
          <span className="text-xs capitalize text-gray-600 sm:text-sm">
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  );
}

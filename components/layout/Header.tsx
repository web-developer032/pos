"use client";

import { useAppSelector } from "@/lib/hooks";

export function Header() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 py-3 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center sm:px-6 sm:py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 sm:text-xl">
            Welcome, {user?.username}
          </h2>
        </div>
        <div className="flex items-center">
          <span className="text-xs text-gray-600 capitalize sm:text-sm">
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  );
}


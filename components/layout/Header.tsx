"use client";

import { useAppSelector } from "@/lib/hooks";

export function Header() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Welcome, {user?.username}
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600 capitalize">
            {user?.role}
          </span>
        </div>
      </div>
    </header>
  );
}


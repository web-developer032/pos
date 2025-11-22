"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { logout } from "@/lib/slices/authSlice";
import { useRouter } from "next/navigation";

interface MenuItem {
  name: string;
  href: string;
  icon: string;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  {
    name: "POS",
    href: "/pos",
    icon: "🛒",
    roles: ["admin", "cashier", "manager"],
  },
  { name: "Products", href: "/products", icon: "📦" },
  { name: "Categories", href: "/categories", icon: "📁" },
  { name: "Suppliers", href: "/suppliers", icon: "🚚" },
  { name: "Customers", href: "/customers", icon: "👥" },
  { name: "Inventory", href: "/inventory", icon: "📊" },
  { name: "Purchase Orders", href: "/purchase-orders", icon: "📋" },
  { name: "Sales", href: "/sales", icon: "💰" },
  { name: "Reports", href: "/reports", icon: "📈" },
  { name: "Users", href: "/users", icon: "👤", roles: ["admin"] },
  {
    name: "Settings",
    href: "/settings",
    icon: "⚙️",
    roles: ["admin", "manager"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = async () => {
    try {
      // Call logout API to clear the httpOnly cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear Redux state and localStorage
      dispatch(logout());
      router.push("/login");
    }
  };

  const filteredMenuItems = menuItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside
      className={`flex flex-col bg-gray-900 text-white transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-48 sm:w-64"
      }`}
    >
      {/* Header with toggle button */}
      <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b border-gray-800">
        {!isCollapsed && (
          <h1 className="text-lg font-bold sm:text-xl lg:text-2xl whitespace-nowrap">
            POS System
          </h1>
        )}
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-md hover:bg-gray-800 transition-colors flex-shrink-0 ${
            isCollapsed ? "mx-auto" : "ml-auto"
          }`}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className="w-5 h-5 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isCollapsed ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Navigation with custom scrollbar */}
      <nav className="flex-1 overflow-y-auto pb-20 sidebar-scrollbar">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center ${
                isCollapsed
                  ? "justify-center px-2 py-3"
                  : "px-3 py-2 sm:px-4 sm:py-3 lg:px-6"
              } text-xs hover:bg-gray-800 sm:text-sm lg:text-base transition-colors group relative ${
                isActive ? "border-r-4 border-indigo-500 bg-gray-800" : ""
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <span className={`${isCollapsed ? "" : "mr-2 sm:mr-3"} text-lg`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="truncate whitespace-nowrap">{item.name}</span>
              )}
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <span className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg border border-gray-700">
                  {item.name}
                  {/* Tooltip arrow */}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-800"></span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer with logout button */}
      <div className="border-t border-gray-800 bg-gray-900 p-3 sm:p-4 lg:p-6">
        {isCollapsed ? (
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-red-600 p-2 hover:bg-red-700 transition-colors flex items-center justify-center"
            title="Logout"
            aria-label="Logout"
          >
            <span className="text-lg">🚪</span>
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full rounded-md bg-red-600 px-3 py-2 text-xs font-medium hover:bg-red-700 sm:px-4 sm:text-sm transition-colors"
          >
            Logout
          </button>
        )}
      </div>

    </aside>
  );
}

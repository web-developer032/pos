"use client";

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
    <aside className="flex flex-col w-48 sm:w-64 bg-gray-900 text-white">
      <div className="p-3 sm:p-4 lg:p-6">
        <h1 className="text-lg font-bold sm:text-xl lg:text-2xl">POS System</h1>
      </div>

      <nav className="flex-1 overflow-y-auto pb-20">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-xs hover:bg-gray-800 sm:px-4 sm:py-3 sm:text-sm lg:px-6 lg:text-base ${
                isActive ? "border-r-4 border-indigo-500 bg-gray-800" : ""
              }`}
            >
              <span className="mr-2 sm:mr-3">{item.icon}</span>
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 bg-gray-900 p-3 sm:p-4 lg:p-6">
        <button
          onClick={handleLogout}
          className="w-full rounded-md bg-red-600 px-3 py-2 text-xs font-medium hover:bg-red-700 sm:px-4 sm:text-sm"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}

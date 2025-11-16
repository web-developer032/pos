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
  { name: "POS", href: "/pos", icon: "🛒", roles: ["admin", "cashier", "manager"] },
  { name: "Products", href: "/products", icon: "📦" },
  { name: "Categories", href: "/categories", icon: "📁" },
  { name: "Suppliers", href: "/suppliers", icon: "🚚" },
  { name: "Customers", href: "/customers", icon: "👥" },
  { name: "Inventory", href: "/inventory", icon: "📊" },
  { name: "Purchase Orders", href: "/purchase-orders", icon: "📋" },
  { name: "Sales", href: "/sales", icon: "💰" },
  { name: "Reports", href: "/reports", icon: "📈" },
  { name: "Users", href: "/users", icon: "👤", roles: ["admin"] },
  { name: "Settings", href: "/settings", icon: "⚙️", roles: ["admin", "manager"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  const filteredMenuItems = menuItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold">POS System</h1>
      </div>
      <nav className="mt-8">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-6 py-3 hover:bg-gray-800 ${
                isActive ? "bg-gray-800 border-r-4 border-indigo-500" : ""
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-0 w-64 p-6 border-t border-gray-800">
        <div className="mb-4">
          <p className="text-sm text-gray-400">Logged in as</p>
          <p className="font-medium">{user?.username}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </div>
  );
}


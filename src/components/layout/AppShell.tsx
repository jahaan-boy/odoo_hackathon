"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart,
  Fuel,
  LayoutDashboard,
  LogOut,
  PieChart,
  Route,
  Truck,
  User,
  Wrench,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Vehicle Registry", icon: Truck, href: "/vehicles" },
  { label: "Trip Dispatcher", icon: Route, href: "/trip-dispatcher" },
  { label: "Maintenance Logs", icon: Wrench, href: "/maintenance" },
  { label: "Trip Expenses & Fuel", icon: Fuel, href: "/expense-and-fuel" },
  { label: "Driver Performance", icon: BarChart, href: "/drivers" },
  { label: "Analytics & Reports", icon: PieChart, href: "/analysis" },
];

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = () => {
    setIsDropdownOpen(false);
    router.push("/sign-in");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="fixed top-0 right-0 left-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Toggle sidebar"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <span className="flex flex-col gap-1">
              <span className="h-0.5 w-5 bg-black" />
              <span className="h-0.5 w-5 bg-black" />
              <span className="h-0.5 w-5 bg-black" />
            </span>
          </button>
          <img
            className="icon"
            src="/logo.png"
            alt="logo"
            width="50"
            height="60"
          ></img>
          <h1 className="text-xl font-bold">Fleet Flow</h1>
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
            aria-label="Profile"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
          >
            <span className="text-sm font-semibold text-gray-700">U</span>
          </button>
          {isDropdownOpen && (
            <div className="absolute top-12 right-0 z-50 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
              <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700">
                <User className="h-4 w-4" />
                <span className="font-medium">Username</span>
              </div>
              <div className="my-1 h-px bg-gray-200" />
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <aside
        className={
          "fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] overflow-visible border-r border-gray-200 bg-white transition-[width] duration-300 ease-in-out " +
          (isOpen ? "w-60" : "w-16")
        }
      >
        <nav className="space-y-1 px-2 py-6">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                className={
                  "group relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition " +
                  (isActive
                    ? "bg-black text-white"
                    : "text-black hover:bg-gray-100")
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {isOpen && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
                {!isOpen && (
                  <span className="pointer-events-none absolute top-1/2 left-full z-50 ml-6 -translate-y-1/2 scale-0 rounded-md bg-gray-900 px-3 py-2 text-sm whitespace-nowrap text-white shadow-lg transition-all duration-150 group-hover:scale-100">
                    {item.label}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </aside>

      <main
        className={
          "min-h-screen px-6 py-6 pt-16 transition-[margin-left] duration-300 ease-in-out md:px-10 " +
          (isOpen ? "ml-60" : "ml-16")
        }
      >
        {children}
      </main>
    </div>
  );
}

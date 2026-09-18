"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, Package, Search, Bell, Settings, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tracked Products", href: "/products", icon: Package },
  { name: "Search Store", href: "/search", icon: Search },
  { name: "Alerts", href: "/alerts", icon: Bell },
  { name: "System Health", href: "/health", icon: HeartPulse },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-zinc-950 px-4 py-6 text-zinc-100">
      <div className="flex items-center gap-2 px-2 pb-8">
        <Activity className="h-6 w-6 text-indigo-500" />
        <span className="text-xl font-bold tracking-tight text-white">PricePulse</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-100"
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  isActive ? "text-indigo-500" : "text-zinc-500 group-hover:text-zinc-300"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <Link
          href="/settings"
          className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-900/50 hover:text-zinc-100"
        >
          <Settings className="h-4 w-4 shrink-0 text-zinc-500 group-hover:text-zinc-300" />
          Settings
        </Link>
      </div>
    </div>
  );
}

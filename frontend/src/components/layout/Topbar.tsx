"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        {/* Placeholder for future breadcrumbs or title */}
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-zinc-400 hover:text-zinc-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-indigo-500" />
          <span className="sr-only">Notifications</span>
        </Button>
      </div>
    </header>
  );
}

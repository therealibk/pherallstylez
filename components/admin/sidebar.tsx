"use client";

import { logout } from "@/lib/actions/auth";
import { NavItems } from "./nav-items";
import { LogOut, Scissors } from "lucide-react";

interface AdminSidebarProps {
  displayName: string;
}

export function AdminSidebar({ displayName }: AdminSidebarProps) {
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <aside
      className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex"
      aria-label="Sidebar"
    >
      {/* Logo / wordmark */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background shrink-0">
          <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Pherall</span>
        <span className="text-xs text-muted-foreground/60 font-medium leading-none border border-border rounded px-1.5 py-0.5 ml-auto">
          Admin
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavItems />
      </div>

      {/* User footer */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {initials || "A"}
          </div>
          <span className="flex-1 truncate text-sm text-muted-foreground leading-none">
            {displayName}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

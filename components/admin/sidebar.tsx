"use client";

import { logout } from "@/lib/actions/auth";
import { NavItems } from "./nav-items";

interface AdminSidebarProps {
  displayName: string;
}

export function AdminSidebar({ displayName }: AdminSidebarProps) {
  return (
    <aside
      className="hidden w-56 shrink-0 flex-col border-r bg-sidebar md:flex"
      aria-label="Sidebar"
    >
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
        <span className="text-sm font-semibold tracking-tight">
          Pherall Admin
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavItems />
      </div>

      <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
        <p className="mb-1.5 truncate px-2.5 text-xs text-muted-foreground">
          {displayName}
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

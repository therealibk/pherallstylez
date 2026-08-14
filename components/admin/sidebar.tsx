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
      className="hidden w-60 shrink-0 flex-col md:flex"
      style={{ background: "var(--foreground)" }}
      aria-label="Sidebar"
    >
      {/* Logo / wordmark */}
      <div
        className="flex h-14 shrink-0 items-center gap-2.5 px-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          <Scissors className="h-3.5 w-3.5" style={{ color: "var(--background)" }} aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--background)" }}>
          Pherall
        </span>
        <span
          className="text-xs font-medium leading-none rounded px-1.5 py-0.5 ml-auto"
          style={{
            background: "rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          Admin
        </span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavItems />
      </div>

      {/* User footer */}
      <div
        className="shrink-0 p-3 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{ background: "rgba(255,255,255,0.15)", color: "var(--background)" }}
          >
            {initials || "A"}
          </div>
          <span
            className="flex-1 truncate text-sm leading-none"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            {displayName}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="flex h-6 w-6 items-center justify-center rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "rgba(255,255,255,0.40)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--background)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.40)")}
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

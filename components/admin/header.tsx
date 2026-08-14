"use client";

import { useState } from "react";
import { Menu, Scissors, LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NavItems } from "./nav-items";

interface AdminHeaderProps {
  displayName: string;
}

export function AdminHeader({ displayName }: AdminHeaderProps) {
  const [open, setOpen] = useState(false);

  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <header
      className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden"
      style={{ background: "var(--foreground)", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "rgba(255,255,255,0.70)" }}
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <SheetContent
          id="mobile-nav"
          side="left"
          className="w-60 gap-0 p-0"
          style={{ background: "var(--foreground)" }}
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          <div
            className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4"
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
              style={{ background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.55)" }}
            >
              Admin
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavItems onNavigate={() => setOpen(false)} />
          </div>

          <div
            className="shrink-0 border-t p-3"
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
                  className="flex h-6 w-6 items-center justify-center rounded transition-colors"
                  style={{ color: "rgba(255,255,255,0.40)" }}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <div
          className="flex h-6 w-6 items-center justify-center rounded shrink-0"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          <Scissors className="h-3 w-3" style={{ color: "var(--background)" }} aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--background)" }}>
          Pherall Admin
        </span>
      </div>
    </header>
  );
}

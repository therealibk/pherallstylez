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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <SheetContent
          id="mobile-nav"
          side="left"
          className="w-60 gap-0 p-0 bg-sidebar"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background shrink-0">
              <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Pherall</span>
            <span className="text-xs text-muted-foreground/60 font-medium leading-none border border-border rounded px-1.5 py-0.5 ml-auto">
              Admin
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavItems onNavigate={() => setOpen(false)} />
          </div>

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
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
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
        <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-background shrink-0">
          <Scissors className="h-3 w-3" aria-hidden="true" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Pherall Admin</span>
      </div>
    </header>
  );
}

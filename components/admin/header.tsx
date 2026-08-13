"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { NavItems } from "./nav-items";

interface AdminHeaderProps {
  displayName: string;
}

export function AdminHeader({ displayName }: AdminHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label="Open navigation menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>

        <SheetContent
          id="mobile-nav"
          side="left"
          className="w-56 gap-0 p-0"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>

          <div className="flex h-14 shrink-0 items-center border-b px-4">
            <span className="text-sm font-semibold tracking-tight">
              Pherall Admin
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavItems onNavigate={() => setOpen(false)} />
          </div>

          <div className="shrink-0 border-t px-3 py-3">
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
        </SheetContent>
      </Sheet>

      <span className="text-sm font-semibold tracking-tight">
        Pherall Admin
      </span>
    </header>
  );
}

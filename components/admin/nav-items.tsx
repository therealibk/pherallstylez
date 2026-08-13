"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ENTRIES, type NavEntry } from "./nav-config";

interface NavItemsProps {
  onNavigate?: () => void;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavItems({ onNavigate }: NavItemsProps) {
  const pathname = usePathname();

  function renderEntry(entry: NavEntry, idx: number) {
    if (entry.type === "item") {
      const active = isActive(entry.href, pathname);
      const Icon = entry.icon;
      return (
        <Link
          key={entry.href}
          href={entry.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
            active
              ? "bg-accent font-medium text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
          aria-current={active ? "page" : undefined}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {entry.label}
        </Link>
      );
    }

    const groupActive = entry.items.some((item) =>
      isActive(item.href, pathname),
    );

    return (
      <div key={`${entry.label}-${idx}`} className="mt-4 first:mt-0">
        <p
          className={cn(
            "mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider",
            groupActive ? "text-foreground/70" : "text-muted-foreground/60",
          )}
        >
          {entry.label}
        </p>
        <div className="space-y-0.5">
          {entry.items.map((item) => {
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <nav aria-label="Admin navigation">
      <div className="space-y-0.5">
        {NAV_ENTRIES.map((entry, idx) => renderEntry(entry, idx))}
      </div>
    </nav>
  );
}

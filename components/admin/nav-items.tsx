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
    if (entry.type !== "group") return null;

    return (
      <div key={`${entry.label}-${idx}`} className={cn(idx > 0 && "mt-5")}>
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
          {entry.label}
        </p>
        <div className="space-y-px">
          {entry.items.map((item) => {
            const active = isActive(item.href, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40",
                  active
                    ? "bg-white/12 font-medium text-white"
                    : "text-white/65 hover:bg-white/8 hover:text-white",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active
                      ? "text-white"
                      : "text-white/45 group-hover:text-white/75",
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70 shrink-0" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <nav aria-label="Admin navigation">
      {NAV_ENTRIES.map((entry, idx) => renderEntry(entry, idx))}
    </nav>
  );
}

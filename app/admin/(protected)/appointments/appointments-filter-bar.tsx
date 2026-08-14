"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { Search } from "lucide-react";
import type { AppointmentStatus } from "@/lib/generated/prisma/client";

interface Props {
  defaultSearch: string;
  defaultDate: string;
  currentStatus: "ALL" | AppointmentStatus;
}

export function AppointmentsFilterBar({ defaultSearch, defaultDate, currentStatus }: Props) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const applyFilters = useCallback(() => {
    const p = new URLSearchParams();
    if (currentStatus && currentStatus !== "ALL") p.set("status", currentStatus);
    const s = searchRef.current?.value.trim();
    if (s) p.set("search", s);
    const d = dateRef.current?.value;
    if (d) p.set("date", d);
    const qs = p.toString();
    router.push(`/admin/appointments${qs ? `?${qs}` : ""}`);
  }, [router, currentStatus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") applyFilters();
  };

  const clear = () => {
    if (searchRef.current) searchRef.current.value = "";
    if (dateRef.current) dateRef.current.value = "";
    const p = new URLSearchParams();
    if (currentStatus && currentStatus !== "ALL") p.set("status", currentStatus);
    const qs = p.toString();
    router.push(`/admin/appointments${qs ? `?${qs}` : ""}`);
  };

  const hasFilters = !!(defaultSearch || defaultDate);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[180px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          placeholder="Search name, email…"
          defaultValue={defaultSearch}
          onKeyDown={handleKeyDown}
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          aria-label="Search appointments"
        />
      </div>

      <input
        ref={dateRef}
        type="date"
        defaultValue={defaultDate}
        onKeyDown={handleKeyDown}
        onChange={applyFilters}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        aria-label="Filter by date"
      />

      <button
        type="button"
        onClick={applyFilters}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        Search
      </button>

      {hasFilters && (
        <button
          type="button"
          onClick={clear}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

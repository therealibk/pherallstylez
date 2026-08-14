"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Search } from "lucide-react";

interface Props {
  defaultSearch: string;
}

export function CustomersSearchBar({ defaultSearch }: Props) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);

  const search = () => {
    const s = ref.current?.value.trim();
    if (s) {
      router.push(`/admin/customers?search=${encodeURIComponent(s)}`);
    } else {
      router.push("/admin/customers");
    }
  };

  return (
    <div className="mb-4 flex gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden="true" />
        <input
          ref={ref}
          type="search"
          placeholder="Search by name, email, phone…"
          defaultValue={defaultSearch}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          aria-label="Search customers"
        />
      </div>
      <button
        type="button"
        onClick={search}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
      >
        Search
      </button>
      {defaultSearch && (
        <button
          type="button"
          onClick={() => { if (ref.current) ref.current.value = ""; router.push("/admin/customers"); }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

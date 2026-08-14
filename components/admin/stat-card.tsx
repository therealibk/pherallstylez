import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, description, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
          {label}
        </span>
        <div className="shrink-0 rounded-md bg-muted p-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

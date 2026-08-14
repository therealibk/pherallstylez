import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  accentColor?: string;
}

export function StatCard({ label, value, description, icon: Icon, accentColor = "#6366f1" }: StatCardProps) {
  return (
    <div
      className="rounded-xl border border-border bg-card px-5 py-4"
      style={{ borderLeftColor: accentColor, borderLeftWidth: "4px" }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
          {label}
        </span>
        <Icon
          className="h-4 w-4 shrink-0"
          style={{ color: accentColor, opacity: 0.8 }}
          aria-hidden="true"
        />
      </div>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

import type { AppointmentStatus } from "@/lib/generated/prisma/client";

const CONFIG: Record<
  AppointmentStatus,
  { label: string; bg: string; color: string }
> = {
  PENDING:   { label: "Pending",   bg: "rgba(245,158,11,0.12)",  color: "#d97706" },
  CONFIRMED: { label: "Confirmed", bg: "rgba(34,197,94,0.12)",   color: "#15803d" },
  COMPLETED: { label: "Completed", bg: "rgba(99,102,241,0.12)",  color: "#4f46e5" },
  CANCELLED: { label: "Cancelled", bg: "rgba(239,68,68,0.12)",   color: "#dc2626" },
  RESCHEDULED: { label: "Rescheduled", bg: "rgba(14,165,233,0.12)", color: "#0284c7" },
  NO_SHOW:   { label: "No-show",   bg: "rgba(113,113,122,0.12)", color: "#52525b" },
};

interface Props {
  status: AppointmentStatus;
  size?: "sm" | "md";
}

export function AppointmentStatusBadge({ status, size = "md" }: Props) {
  const { label, bg, color } = CONFIG[status] ?? CONFIG.PENDING;
  const padding = size === "sm" ? "2px 8px" : "3px 10px";
  const fontSize = size === "sm" ? "11px" : "12px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        background: bg,
        color,
        fontSize,
        fontWeight: 600,
        letterSpacing: "0.03em",
        padding,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

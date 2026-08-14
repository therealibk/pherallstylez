import type { PaymentStatus } from "@/lib/generated/prisma/client";

const CONFIG: Record<PaymentStatus, { label: string; bg: string; color: string }> = {
  PENDING:            { label: "Pending",           bg: "rgba(245,158,11,0.12)",  color: "#d97706" },
  DEPOSIT_PAID:       { label: "Deposit paid",      bg: "rgba(34,197,94,0.12)",   color: "#15803d" },
  PAID_IN_FULL:       { label: "Paid in full",      bg: "rgba(34,197,94,0.15)",   color: "#14532d" },
  FAILED:             { label: "Failed",            bg: "rgba(239,68,68,0.12)",   color: "#dc2626" },
  REFUNDED:           { label: "Refunded",          bg: "rgba(113,113,122,0.12)", color: "#52525b" },
  PARTIALLY_REFUNDED: { label: "Partially refunded",bg: "rgba(14,165,233,0.12)",  color: "#0284c7" },
};

interface Props {
  status: PaymentStatus;
  size?: "sm" | "md";
}

export function PaymentStatusBadge({ status, size = "md" }: Props) {
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

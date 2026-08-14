"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, CheckSquare, AlertTriangle, RefreshCw } from "lucide-react";
import {
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  markNoShow,
  rescheduleAppointment,
} from "@/lib/actions/appointments";
import type { AppointmentStatus } from "@/lib/generated/prisma/client";

interface Props {
  id: string;
  status: AppointmentStatus;
  startAt?: Date;
  timezone?: string;
  durationMins?: number;
}

export function AppointmentActions({ id, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const run = (action: () => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Something went wrong");
      } else {
        router.refresh();
      }
    });
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-wrap gap-2 items-start">
      {error && (
        <div className="w-full rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600" role="alert">
          {error}
        </div>
      )}

      {status === "PENDING" && (
        <ActionButton
          onClick={() => run(() => confirmAppointment(id))}
          disabled={isPending}
          icon={<CheckCircle className="h-4 w-4" />}
          label="Confirm"
          variant="primary"
        />
      )}

      {status === "CONFIRMED" && (
        <>
          <ActionButton
            onClick={() => run(() => completeAppointment(id))}
            disabled={isPending}
            icon={<CheckSquare className="h-4 w-4" />}
            label="Complete"
            variant="primary"
          />
          <ActionButton
            onClick={() => run(() => markNoShow(id))}
            disabled={isPending}
            icon={<AlertTriangle className="h-4 w-4" />}
            label="No-show"
            variant="secondary"
          />
        </>
      )}

      {["PENDING", "CONFIRMED"].includes(status) && (
        <>
          <ActionButton
            onClick={() => setShowReschedule((v) => !v)}
            disabled={isPending}
            icon={<RefreshCw className="h-4 w-4" />}
            label="Reschedule"
            variant="secondary"
          />
          <ActionButton
            onClick={() => setShowCancel((v) => !v)}
            disabled={isPending}
            icon={<XCircle className="h-4 w-4" />}
            label="Cancel"
            variant="danger"
          />
        </>
      )}

      {/* Inline cancel form */}
      {showCancel && (
        <div className="w-full mt-1 rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">Cancel appointment</p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Optional cancellation reason…"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => cancelAppointment(id, cancelReason || undefined))}
              className="rounded-full px-4 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Cancelling…" : "Confirm cancellation"}
            </button>
            <button
              type="button"
              onClick={() => setShowCancel(false)}
              className="rounded-full px-4 py-1.5 text-xs font-medium border border-border hover:bg-muted/40 transition-colors"
            >
              Keep appointment
            </button>
          </div>
        </div>
      )}

      {/* Inline reschedule form */}
      {showReschedule && (
        <div className="w-full mt-1 rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">Reschedule appointment</p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="date"
              value={newDate}
              min={today}
              onChange={(e) => setNewDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              aria-label="New date"
            />
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              aria-label="New time"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending || !newDate || !newTime}
              onClick={() => run(() => rescheduleAppointment(id, newDate, newTime))}
              className="rounded-full px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: "var(--foreground)", color: "var(--background)" }}
            >
              {isPending ? "Rescheduling…" : "Confirm reschedule"}
            </button>
            <button
              type="button"
              onClick={() => setShowReschedule(false)}
              className="rounded-full px-4 py-1.5 text-xs font-medium border border-border hover:bg-muted/40 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon,
  label,
  variant,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  variant: "primary" | "secondary" | "danger";
}) {
  const styles =
    variant === "primary"
      ? { background: "var(--foreground)", color: "var(--background)", border: "none" }
      : variant === "danger"
        ? { background: "transparent", color: "#dc2626", borderColor: "#fca5a5" }
        : { background: "transparent", color: "var(--foreground)", borderColor: "var(--border)" };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
      style={styles}
    >
      {icon}
      {label}
    </button>
  );
}

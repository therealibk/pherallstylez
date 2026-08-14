"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  X, ExternalLink, CheckCircle2, XCircle, CheckCheck,
  UserX, Calendar, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DrawerAppt } from "@/lib/actions/calendar";
import { fetchDrawerAppointment } from "@/lib/actions/calendar";
import {
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  markNoShow,
  rescheduleAppointment,
} from "@/lib/actions/appointments";
import type { AppointmentStatus } from "@/lib/generated/prisma/client";

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  PENDING:     "#f59e0b",
  CONFIRMED:   "#22c55e",
  COMPLETED:   "#8b5cf6",
  CANCELLED:   "#ef4444",
  RESCHEDULED: "#0ea5e9",
  NO_SHOW:     "#71717a",
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING:     "Pending",
  CONFIRMED:   "Confirmed",
  COMPLETED:   "Completed",
  CANCELLED:   "Cancelled",
  RESCHEDULED: "Rescheduled",
  NO_SHOW:     "No-show",
};

function fmt(isoStr: string, timezone: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, ...opts }).format(new Date(isoStr));
}

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

interface DrawerContentProps {
  appointmentId: string;
  onClose: () => void;
  onActionComplete: () => void;
  timezone: string;
}

// Inner content resets via key={appointmentId} — no synchronous setState in effect
function DrawerContent({ appointmentId, onClose, onActionComplete, timezone }: DrawerContentProps) {
  const [appt, setAppt] = useState<DrawerAppt | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    fetchDrawerAppointment(appointmentId).then((data) => {
      setAppt(data);
      if (data) {
        setNewDate(data.startAtDate);
        setNewTime(data.startAtTime);
      }
      setLoading(false);
    });
  }, [appointmentId]);

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success && "error" in result) {
        setActionError(result.error ?? "Action failed");
      } else {
        onActionComplete();
        fetchDrawerAppointment(appointmentId).then(setAppt);
        setConfirmCancel(false);
        setShowReschedule(false);
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!appt) {
    return <p className="p-6 text-sm text-muted-foreground">Appointment not found.</p>;
  }

  return (
    <div className="p-5 space-y-5">
      {/* Status */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full"
          style={{
            background: STATUS_COLOR[appt.status] + "20",
            color: STATUS_COLOR[appt.status],
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ background: STATUS_COLOR[appt.status] }}
          />
          {STATUS_LABEL[appt.status]}
        </span>
        {appt.latestPaymentStatus && (
          <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
            {appt.latestPaymentStatus.replace(/_/g, " ")}
          </span>
        )}
      </div>

      {/* Service + time */}
      <div className="space-y-1">
        <p className="font-semibold">{appt.serviceName}</p>
        <p className="text-sm text-muted-foreground">
          {fmt(appt.startAt, timezone, {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
        <p className="text-sm text-muted-foreground">
          {fmt(appt.startAt, timezone, { hour: "2-digit", minute: "2-digit", hour12: false })}
          {" – "}
          {fmt(appt.endAt, timezone, { hour: "2-digit", minute: "2-digit", hour12: false })}
          {" "}
          <span className="text-muted-foreground/60">({appt.durationMins} min)</span>
          {appt.bufferMins > 0 && (
            <span className="text-muted-foreground/50"> + {appt.bufferMins} min buffer</span>
          )}
        </p>
      </div>

      {/* Customer */}
      <div className="rounded-lg border border-border p-3 space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Customer</p>
        <p className="text-sm font-medium">
          {appt.customer.firstName} {appt.customer.lastName}
        </p>
        <p className="text-xs text-muted-foreground">{appt.customer.email}</p>
        {appt.customer.phone && (
          <p className="text-xs text-muted-foreground">{appt.customer.phone}</p>
        )}
        <Link
          href={`/admin/customers/${appt.customer.id}`}
          className="text-xs underline underline-offset-2 hover:opacity-70 transition-opacity"
        >
          View customer
        </Link>
      </div>

      {/* Price */}
      <div className="text-sm space-y-0.5">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Price</span>
          <span>{formatGBP(appt.pricePence)}</span>
        </div>
        {appt.depositPence > 0 && appt.depositPence < appt.pricePence && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deposit</span>
            <span>{formatGBP(appt.depositPence)}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {appt.notes && (
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Customer note</p>
          <p className="text-muted-foreground">{appt.notes}</p>
        </div>
      )}
      {appt.adminNotes && (
        <div className="text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Internal note</p>
          <p>{appt.adminNotes}</p>
        </div>
      )}

      {/* Error */}
      {actionError && (
        <p role="alert" className="text-sm text-destructive">{actionError}</p>
      )}

      {/* Quick actions */}
      {!["COMPLETED", "CANCELLED", "NO_SHOW"].includes(appt.status) && (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</p>

          <div className="flex flex-wrap gap-2">
            {appt.status === "PENDING" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                onClick={() => runAction(() => confirmAppointment(appt.id))}
                disabled={isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Confirm
              </Button>
            )}

            {appt.status === "CONFIRMED" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-purple-700 border-purple-200 hover:bg-purple-50"
                  onClick={() => runAction(() => completeAppointment(appt.id))}
                  disabled={isPending}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-gray-600"
                  onClick={() => runAction(() => markNoShow(appt.id))}
                  disabled={isPending}
                >
                  <UserX className="h-3.5 w-3.5" />
                  No-show
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => { setShowReschedule(!showReschedule); setConfirmCancel(false); }}
              disabled={isPending}
            >
              <Calendar className="h-3.5 w-3.5" />
              Reschedule
            </Button>

            {!confirmCancel ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive border-red-200 hover:bg-red-50"
                onClick={() => { setConfirmCancel(true); setShowReschedule(false); }}
                disabled={isPending}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </Button>
            ) : (
              <div className="w-full space-y-2">
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Reason for cancellation (optional)"
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => runAction(() => cancelAppointment(appt.id, cancelReason || undefined))}
                    disabled={isPending}
                  >
                    {isPending ? "Cancelling…" : "Confirm cancel"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)}>
                    Keep
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Reschedule form */}
          {showReschedule && (
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/20">
              <p className="text-sm font-medium">Reschedule appointment</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">New date</Label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">New time</Label>
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    step={900}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => runAction(() => rescheduleAppointment(appt.id, newDate, newTime))}
                  disabled={isPending || !newDate || !newTime}
                >
                  {isPending ? "Saving…" : "Confirm"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowReschedule(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full detail link */}
      <div className="border-t border-border pt-4">
        <Link
          href={`/admin/appointments/${appt.id}`}
          className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Full appointment detail
        </Link>
      </div>

      {/* Close from within content (mobile) */}
      <button
        onClick={onClose}
        className="sr-only"
        aria-label="Close appointment details"
      />
    </div>
  );
}

interface Props {
  appointmentId: string | null;
  onClose: () => void;
  onActionComplete: () => void;
  timezone: string;
}

export function AppointmentDrawer({ appointmentId, onClose, onActionComplete, timezone }: Props) {
  const isOpen = Boolean(appointmentId);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer shell — handles CSS slide animation */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Appointment details"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col transition-transform duration-200"
        style={{ transform: isOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">Appointment details</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted/60 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — inner content resets via key when appointmentId changes */}
        <div className="flex-1 overflow-y-auto">
          {appointmentId ? (
            <DrawerContent
              key={appointmentId}
              appointmentId={appointmentId}
              onClose={onClose}
              onActionComplete={onActionComplete}
              timezone={timezone}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}

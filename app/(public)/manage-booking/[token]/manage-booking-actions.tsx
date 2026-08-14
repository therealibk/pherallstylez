"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelByToken, rescheduleByToken } from "@/lib/actions/manage-booking";
import { getAvailableSlotsForDate } from "@/lib/actions/public-availability";

interface Props {
  token: string;
  canCancel: boolean;
  canReschedule: boolean;
  serviceSlug: string;
  cancellationDeadlineHours: number;
  reschedulingDeadlineHours: number;
}

type View = "idle" | "cancel" | "reschedule";

export function ManageBookingActions({
  token,
  canCancel,
  canReschedule,
  serviceSlug,
  cancellationDeadlineHours,
  reschedulingDeadlineHours,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>("idle");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cancel state
  const [cancelReason, setCancelReason] = useState("");

  // Reschedule state
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const now = new Date();
  const minDate = new Date(now.getTime() + 24 * 3_600_000).toISOString().slice(0, 10);

  const loadSlots = async (dateStr: string) => {
    setLoadingSlots(true);
    setNewTime("");
    try {
      const slots = await getAvailableSlotsForDate(serviceSlug, dateStr);
      setAvailableSlots(slots);
    } catch {
      setAvailableSlots([]);
    }
    setLoadingSlots(false);
  };

  const handleDateChange = (dateStr: string) => {
    setNewDate(dateStr);
    if (dateStr) void loadSlots(dateStr);
  };

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelByToken(token, cancelReason || undefined);
      if (result.success) {
        setSuccess("Your appointment has been cancelled.");
        setView("idle");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const handleReschedule = () => {
    if (!newDate || !newTime) return;
    setError(null);
    startTransition(async () => {
      const result = await rescheduleByToken(token, newDate, newTime);
      if (result.success) {
        setSuccess("Your appointment has been rescheduled.");
        setView("idle");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800 text-center">
        {success}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {view === "idle" && (
        <div className="flex flex-col gap-3">
          {canReschedule && (
            <button
              type="button"
              onClick={() => setView("reschedule")}
              className="w-full rounded-full py-3 text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: "var(--foreground)", color: "var(--background)" }}
            >
              Reschedule appointment
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => setView("cancel")}
              className="w-full rounded-full py-3 text-sm font-medium border border-border hover:bg-muted/40 transition-colors"
              style={{ color: "var(--foreground)" }}
            >
              Cancel appointment
            </button>
          )}
          {canCancel && (
            <p className="text-xs text-muted-foreground text-center">
              Cancellations must be made at least {cancellationDeadlineHours} hours before your appointment.
            </p>
          )}
        </div>
      )}

      {view === "cancel" && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Cancel appointment</h2>
          <p className="text-xs text-muted-foreground">
            This action cannot be undone. Cancellations must be made at least {cancellationDeadlineHours} hours before your appointment.
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Optional: let us know why you're cancelling…"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={handleCancel}
              className="flex-1 rounded-full py-2.5 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Cancelling…" : "Confirm cancellation"}
            </button>
            <button
              type="button"
              onClick={() => setView("idle")}
              className="flex-1 rounded-full py-2.5 text-sm font-medium border border-border hover:bg-muted/40 transition-colors"
            >
              Keep appointment
            </button>
          </div>
        </div>
      )}

      {view === "reschedule" && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Reschedule appointment</h2>
          <p className="text-xs text-muted-foreground">
            Rescheduling must be done at least {reschedulingDeadlineHours} hours before your current appointment.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1.5">New date</label>
              <input
                type="date"
                value={newDate}
                min={minDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              />
            </div>

            {newDate && (
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Available times
                  {loadingSlots && " (loading…)"}
                </label>
                {availableSlots.length === 0 && !loadingSlots ? (
                  <p className="text-xs text-muted-foreground">No available slots on this date. Please choose another day.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setNewTime(slot)}
                        className="rounded-lg border py-2 text-xs font-medium transition-colors"
                        style={
                          newTime === slot
                            ? { background: "var(--foreground)", color: "var(--background)", borderColor: "var(--foreground)" }
                            : { borderColor: "var(--border)" }
                        }
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={isPending || !newDate || !newTime}
              onClick={handleReschedule}
              className="flex-1 rounded-full py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: "var(--foreground)", color: "var(--background)" }}
            >
              {isPending ? "Rescheduling…" : "Confirm reschedule"}
            </button>
            <button
              type="button"
              onClick={() => setView("idle")}
              className="flex-1 rounded-full py-2.5 text-sm font-medium border border-border hover:bg-muted/40 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

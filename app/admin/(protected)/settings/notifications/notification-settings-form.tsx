"use client";

import { useState, useTransition } from "react";
import { saveBookingSettings, getBookingSettings } from "@/lib/actions/booking-settings";

interface Props {
  reminderHours: number[];
  customerCanCancel: boolean;
  customerCanReschedule: boolean;
  cancellationDeadlineHours: number;
  reschedulingDeadlineHours: number;
}

export function NotificationSettingsForm({
  reminderHours: initialReminders,
  customerCanCancel: initialCanCancel,
  customerCanReschedule: initialCanReschedule,
  cancellationDeadlineHours: initialCancelDeadline,
  reschedulingDeadlineHours: initialRescheduleDeadline,
}: Props) {
  const [reminders, setReminders] = useState(initialReminders.join(", "));
  const [canCancel, setCanCancel] = useState(initialCanCancel);
  const [canReschedule, setCanReschedule] = useState(initialCanReschedule);
  const [cancelDeadline, setCancelDeadline] = useState(initialCancelDeadline);
  const [rescheduleDeadline, setRescheduleDeadline] = useState(initialRescheduleDeadline);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(false);

    const parsed = reminders
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0 && n <= 168);

    startTransition(async () => {
      const current = await getBookingSettings();

      const result = await saveBookingSettings({
        ...current,
        reminderHours: parsed,
        customerCanCancel: canCancel,
        customerCanReschedule: canReschedule,
        cancellationDeadlineHours: cancelDeadline,
        reschedulingDeadlineHours: rescheduleDeadline,
      });

      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Reminder hours */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Email Reminders
          </h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label htmlFor="reminder-hours" className="block text-sm font-medium mb-1.5">
              Reminder timing (hours before appointment)
            </label>
            <input
              id="reminder-hours"
              type="text"
              value={reminders}
              onChange={(e) => setReminders(e.target.value)}
              placeholder="48, 24"
              className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Comma-separated hours, e.g. <code className="font-mono">48, 24</code> sends reminders 48 hours and 24 hours before each appointment. Maximum 5 values, 1–168 hours each.
            </p>
          </div>
          <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            Reminders are sent automatically. Add <code className="font-mono">RESEND_API_KEY</code> and <code className="font-mono">EMAIL_FROM</code> to your environment variables to activate email delivery.
          </p>
        </div>
      </section>

      {/* Customer permissions */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Customer Self-Service
          </h2>
        </div>
        <div className="divide-y divide-border">
          {/* Cancel toggle */}
          <div className="flex items-start justify-between gap-6 px-5 py-4">
            <div>
              <p className="text-sm font-medium">Allow customer cancellation</p>
              <p className="text-xs text-muted-foreground mt-0.5">Customers can cancel their appointment via their secure management link</p>
            </div>
            <Toggle value={canCancel} onChange={setCanCancel} id="allow-cancel" />
          </div>

          {canCancel && (
            <div className="flex items-center justify-between gap-6 px-5 py-4">
              <label htmlFor="cancel-deadline" className="text-sm">
                Cancellation deadline (hours before)
              </label>
              <input
                id="cancel-deadline"
                type="number"
                min={0}
                max={168}
                value={cancelDeadline}
                onChange={(e) => setCancelDeadline(parseInt(e.target.value, 10) || 0)}
                className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              />
            </div>
          )}

          {/* Reschedule toggle */}
          <div className="flex items-start justify-between gap-6 px-5 py-4">
            <div>
              <p className="text-sm font-medium">Allow customer rescheduling</p>
              <p className="text-xs text-muted-foreground mt-0.5">Customers can reschedule their appointment via their secure management link</p>
            </div>
            <Toggle value={canReschedule} onChange={setCanReschedule} id="allow-reschedule" />
          </div>

          {canReschedule && (
            <div className="flex items-center justify-between gap-6 px-5 py-4">
              <label htmlFor="reschedule-deadline" className="text-sm">
                Rescheduling deadline (hours before)
              </label>
              <input
                id="reschedule-deadline"
                type="number"
                min={0}
                max={168}
                value={rescheduleDeadline}
                onChange={(e) => setRescheduleDeadline(parseInt(e.target.value, 10) || 0)}
                className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              />
            </div>
          )}
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-full px-6 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
        {saved && <p className="text-sm text-green-600">Settings saved</p>}
        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
      </div>
    </div>
  );
}

function Toggle({ value, onChange, id }: { value: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2"
      style={{ background: value ? "var(--foreground)" : "var(--muted)" }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full shadow transition-transform"
        style={{
          background: "var(--background)",
          transform: value ? "translateX(20px)" : "translateX(2px)",
        }}
      />
    </button>
  );
}

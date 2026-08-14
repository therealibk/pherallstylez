"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createBlockedPeriod,
  updateBlockedPeriod,
  deleteBlockedPeriod,
} from "@/lib/actions/availability-rules";

interface BlockedPeriod {
  id: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  reason: string | null;
  recurrence: string;
  recurrenceEndDate: Date | null;
}

interface Props {
  initial: BlockedPeriod[];
  timezone: string;
}

function formatDate(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function dateToInputLocal(date: Date, tz: string): string {
  // Returns YYYY-MM-DDTHH:MM suitable for datetime-local input
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function dateToDateInput(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

interface FormState {
  startDate: string;   // YYYY-MM-DD
  startTime: string;   // HH:MM
  endDate: string;
  endTime: string;
  allDay: boolean;
  reason: string;
  recurrence: "NONE" | "WEEKLY" | "MONTHLY";
  recurrenceEndDate: string; // YYYY-MM-DD or ""
}

function defaultForm(tz: string): FormState {
  const tomorrow = new Date(Date.now() + 86_400_000);
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(tomorrow);
  return {
    startDate: dateStr,
    startTime: "09:00",
    endDate: dateStr,
    endTime: "17:00",
    allDay: false,
    reason: "",
    recurrence: "NONE",
    recurrenceEndDate: "",
  };
}

function formToPayload(form: FormState, tz: string) {
  // Convert local date+time to UTC ISO string using the timezone
  // We use wallClockToUtc logic inline via a small trick:
  // Build a fake ISO string and offset using Intl
  function toUtcIso(dateStr: string, timeStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [h, min] = timeStr.split(":").map(Number);
    // Estimate: treat as UTC first
    const est = new Date(Date.UTC(y, m - 1, d, h, min));
    // Get TZ offset at this estimate
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "numeric", second: "numeric",
      hour12: false,
    }).formatToParts(est);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
    const tzAsUtc = new Date(Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") === 24 ? 0 : get("hour"), get("minute"), get("second")));
    const offsetMs = est.getTime() - tzAsUtc.getTime();
    const utc = new Date(Date.UTC(y, m - 1, d, h, min) + offsetMs);
    return utc.toISOString();
  }

  const base = form.allDay
    ? {
        startAt: toUtcIso(form.startDate, "00:00"),
        endAt: toUtcIso(form.endDate, "24:00"),
        allDay: true,
        reason: form.reason,
      }
    : {
        startAt: toUtcIso(form.startDate, form.startTime),
        endAt: toUtcIso(form.endDate, form.endTime),
        allDay: false,
        reason: form.reason,
      };
  return {
    ...base,
    recurrence: form.recurrence,
    recurrenceEndDate: form.recurrenceEndDate
      ? toUtcIso(form.recurrenceEndDate, "23:59")
      : null,
  };
}

export function BlockedPeriodsManager({ initial, timezone }: Props) {
  const [periods, setPeriods] = useState<BlockedPeriod[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => defaultForm(timezone));
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setForm(defaultForm(timezone));
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(p: BlockedPeriod) {
    setForm({
      startDate: dateToDateInput(p.startAt, timezone),
      startTime: dateToInputLocal(p.startAt, timezone).slice(11),
      endDate: dateToDateInput(p.endAt, timezone),
      endTime: dateToInputLocal(p.endAt, timezone).slice(11),
      allDay: p.allDay,
      reason: p.reason ?? "",
      recurrence: (p.recurrence as "NONE" | "WEEKLY" | "MONTHLY") ?? "NONE",
      recurrenceEndDate: p.recurrenceEndDate ? dateToDateInput(p.recurrenceEndDate, timezone) : "",
    });
    setEditingId(p.id);
    setShowForm(true);
    setError(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  function handleSubmit() {
    setError(null);
    const payload = formToPayload(form, timezone);
    startTransition(async () => {
      const result = editingId
        ? await updateBlockedPeriod(editingId, payload)
        : await createBlockedPeriod(payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Refresh from server (simple: reload page state via router)
      // For optimistic UI, we'd need the server to return the created record.
      // For now, navigate away then back — but simpler: just reload.
      window.location.reload();
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteBlockedPeriod(id);
      if (!result.success) {
        setError(result.error);
        setDeletingId(null);
        return;
      }
      setPeriods((prev) => prev.filter((p) => p.id !== id));
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-4">
      {/* List */}
      {periods.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No blocked periods. Add one to prevent bookings during specific times.
        </p>
      )}

      {periods.length > 0 && (
        <div className="rounded-md border divide-y">
          {periods.map((p) => (
            <div key={p.id} className="flex items-start gap-3 p-3 sm:p-4">
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">
                    {p.allDay ? "All day" : `${formatDate(p.startAt, timezone)} – ${formatDate(p.endAt, timezone)}`}
                  </p>
                  {p.recurrence !== "NONE" && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                      {p.recurrence === "WEEKLY" ? "Weekly" : "Monthly"}
                    </span>
                  )}
                </div>
                {p.allDay && (
                  <p className="text-xs text-muted-foreground">
                    {dateToDateInput(p.startAt, timezone)} – {dateToDateInput(p.endAt, timezone)}
                  </p>
                )}
                {p.recurrence !== "NONE" && p.recurrenceEndDate && (
                  <p className="text-xs text-muted-foreground">
                    Until {dateToDateInput(p.recurrenceEndDate, timezone)}
                  </p>
                )}
                {p.reason && (
                  <p className="text-xs text-muted-foreground">{p.reason}</p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => openEdit(p)}
                  aria-label="Edit blocked period"
                  disabled={isPending}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Button>

                {deletingId === p.id ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(p.id)}
                      disabled={isPending}
                    >
                      {isPending ? "…" : "Delete"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingId(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingId(p.id)}
                    aria-label="Delete blocked period"
                    className="text-destructive hover:text-destructive"
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      {/* Add/Edit form */}
      {showForm && (
        <div className="rounded-md border p-4 space-y-4 bg-muted/20">
          <p className="text-sm font-medium">
            {editingId ? "Edit blocked period" : "New blocked period"}
          </p>

          <div className="flex items-center gap-2">
            <Switch
              id="allDay"
              checked={form.allDay}
              onCheckedChange={(v) => setForm((f) => ({ ...f, allDay: v }))}
            />
            <Label htmlFor="allDay" className="cursor-pointer text-sm">All day</Label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-sm">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="h-9"
              />
            </div>
            {!form.allDay && (
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-sm">Start time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-sm">End date</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="h-9"
              />
            </div>
            {!form.allDay && (
              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="text-sm">End time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="h-9"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-sm">Reason (optional)</Label>
            <Input
              id="reason"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. Holiday, Personal appointment"
              className="h-9"
              maxLength={500}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recurrence" className="text-sm">Recurrence</Label>
            <select
              id="recurrence"
              value={form.recurrence}
              onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value as "NONE" | "WEEKLY" | "MONTHLY" }))}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="NONE">One-time</option>
              <option value="WEEKLY">Every week (same day)</option>
              <option value="MONTHLY">Every month (same date)</option>
            </select>
          </div>

          {form.recurrence !== "NONE" && (
            <div className="space-y-1.5">
              <Label htmlFor="recurrenceEndDate" className="text-sm">Recurrence ends (optional)</Label>
              <Input
                id="recurrenceEndDate"
                type="date"
                value={form.recurrenceEndDate}
                onChange={(e) => setForm((f) => ({ ...f, recurrenceEndDate: e.target.value }))}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Leave blank to repeat indefinitely.</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={handleSubmit} disabled={isPending}>
              <Check className="h-4 w-4 mr-1.5" aria-hidden="true" />
              {isPending ? "Saving…" : editingId ? "Save changes" : "Add blocked period"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={cancelForm}>
              <X className="h-4 w-4 mr-1" aria-hidden="true" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!showForm && (
        <Button type="button" variant="outline" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Add blocked period
        </Button>
      )}
    </div>
  );
}

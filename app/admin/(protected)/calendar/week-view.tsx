"use client";

import { useRef, useState, useEffect } from "react";
import type { CalendarAppt } from "@/lib/actions/calendar";
import { rescheduleAppointment } from "@/lib/actions/appointments";
import type { AppointmentStatus } from "@/lib/generated/prisma/client";

const HOUR_HEIGHT = 64;
const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;

const STATUS_BG: Record<AppointmentStatus, string> = {
  PENDING:     "#fef3c7",
  CONFIRMED:   "#dcfce7",
  COMPLETED:   "#ede9fe",
  CANCELLED:   "#fee2e2",
  RESCHEDULED: "#e0f2fe",
  NO_SHOW:     "#f4f4f5",
};
const STATUS_BORDER: Record<AppointmentStatus, string> = {
  PENDING:     "#f59e0b",
  CONFIRMED:   "#22c55e",
  COMPLETED:   "#8b5cf6",
  CANCELLED:   "#ef4444",
  RESCHEDULED: "#0ea5e9",
  NO_SHOW:     "#71717a",
};

function minuteOfDay(isoStr: string, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoStr));
  const h = parseInt(parts.find((p) => p.type === "hour")!.value, 10);
  const m = parseInt(parts.find((p) => p.type === "minute")!.value, 10);
  return h * 60 + m;
}

function topPx(isoStr: string, timezone: string): number {
  const min = minuteOfDay(isoStr, timezone);
  return ((min - START_HOUR * 60) * HOUR_HEIGHT) / 60;
}

function heightPx(durationMins: number): number {
  return (durationMins * HOUR_HEIGHT) / 60;
}

function bufferHeightPx(bufferMins: number): number {
  return (bufferMins * HOUR_HEIGHT) / 60;
}

function isoDateStr(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getWeekDays(anchor: Date, timezone: string): Date[] {
  const anchorStr = isoDateStr(anchor, timezone);
  const [y, m, d] = anchorStr.split("-").map(Number);
  const anchorLocal = new Date(y, m - 1, d);
  const dow = (anchorLocal.getDay() + 6) % 7; // 0=Mon
  const monday = new Date(anchorLocal);
  monday.setDate(anchorLocal.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

interface Props {
  appointments: CalendarAppt[];
  anchorDate: Date;
  timezone: string;
  onAppointmentClick: (id: string) => void;
  onRescheduled: () => void;
}

export function WeekView({ appointments, anchorDate, timezone, onAppointmentClick, onRescheduled }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [nowTop, setNowTop] = useState<number | null>(null);

  const weekDays = getWeekDays(anchorDate, timezone);
  const today = isoDateStr(new Date(), timezone);

  useEffect(() => {
    function updateNow() {
      const min = minuteOfDay(new Date().toISOString(), timezone);
      if (min >= START_HOUR * 60 && min <= END_HOUR * 60) {
        setNowTop(((min - START_HOUR * 60) * HOUR_HEIGHT) / 60);
      } else {
        setNowTop(null);
      }
    }
    updateNow();
    const id = setInterval(updateNow, 60_000);
    return () => clearInterval(id);
  }, [timezone]);

  const apptsByDay: Record<string, CalendarAppt[]> = {};
  for (const appt of appointments) {
    const dayStr = isoDateStr(new Date(appt.startAt), timezone);
    (apptsByDay[dayStr] ??= []).push(appt);
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    setDropError(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, dayDate: Date) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (!id || rescheduling) return;

    const col = e.currentTarget as HTMLElement;
    const rect = col.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const minutesFromStart = Math.round(((relativeY / HOUR_HEIGHT) * 60) / 15) * 15;
    const totalMinutes = START_HOUR * 60 + minutesFromStart;
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const mm = String(totalMinutes % 60).padStart(2, "0");
    const newTime = `${hh}:${mm}`;
    const newDate = isoDateStr(dayDate, timezone);

    setRescheduling(true);
    setDropError(null);
    try {
      const result = await rescheduleAppointment(id, newDate, newTime);
      if (!result.success && "error" in result) {
        setDropError(result.error ?? "Reschedule failed");
      } else {
        onRescheduled();
      }
    } finally {
      setRescheduling(false);
      setDragId(null);
    }
  }

  const hourLabels = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="flex flex-col min-h-0">
      {dropError && (
        <p role="alert" className="text-sm text-destructive px-4 py-1">{dropError}</p>
      )}

      {/* Day header row */}
      <div className="flex border-b border-border bg-background sticky top-0 z-10">
        <div className="w-14 shrink-0" />
        {weekDays.map((day) => {
          const ds = isoDateStr(day, timezone);
          const isToday = ds === today;
          const label = new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            weekday: "short",
            day: "numeric",
          }).format(day);
          return (
            <div
              key={ds}
              className="flex-1 text-center py-2 text-xs font-semibold"
              style={isToday ? { color: "var(--foreground)" } : { color: "var(--muted-foreground)" }}
            >
              {isToday ? (
                <span className="inline-flex flex-col items-center gap-0.5">
                  <span>{label.split(" ")[0]}</span>
                  <span
                    className="h-6 w-6 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: "var(--foreground)", color: "var(--background)" }}
                  >
                    {label.split(" ")[1]}
                  </span>
                </span>
              ) : (
                label
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="overflow-y-auto flex-1" ref={gridRef}>
        <div className="flex" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Time gutter */}
          <div className="w-14 shrink-0 relative select-none" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
            {hourLabels.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-right pr-2 text-[10px] text-muted-foreground/60 leading-none"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 6 }}
              >
                {h < END_HOUR ? `${String(h).padStart(2, "0")}:00` : ""}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const ds = isoDateStr(day, timezone);
            const isToday = ds === today;
            const dayAppts = apptsByDay[ds] ?? [];

            return (
              <div
                key={ds}
                className="flex-1 relative border-l border-border"
                style={{
                  height: TOTAL_HOURS * HOUR_HEIGHT,
                  background: isToday ? "rgba(var(--foreground-rgb,26,26,26), 0.025)" : undefined,
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
                data-date={ds}
              >
                {/* Hour grid lines */}
                {hourLabels.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/40"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Current time indicator */}
                {isToday && nowTop !== null && (
                  <div
                    className="absolute left-0 right-0 z-10 flex items-center"
                    style={{ top: nowTop }}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                    <div className="flex-1 border-t border-red-500" />
                  </div>
                )}

                {/* Appointments */}
                {dayAppts.map((appt) => {
                  const top = topPx(appt.startAt, timezone);
                  const h = heightPx(appt.durationMins);
                  const buf = bufferHeightPx(appt.bufferMins);
                  if (top + h < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;

                  return (
                    <div
                      key={appt.id}
                      className="absolute left-1 right-1"
                      style={{ top, height: h + buf }}
                    >
                      {/* Buffer zone */}
                      {buf > 0 && (
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-b border border-dashed border-muted-foreground/20 bg-muted/30"
                          style={{ height: buf }}
                          title={`${appt.bufferMins} min buffer`}
                        />
                      )}
                      {/* Appointment block */}
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, appt.id)}
                        onClick={() => onAppointmentClick(appt.id)}
                        className="absolute left-0 right-0 top-0 rounded cursor-pointer select-none overflow-hidden transition-opacity hover:opacity-90 active:opacity-70"
                        style={{
                          height: h,
                          background: STATUS_BG[appt.status],
                          borderLeft: `3px solid ${STATUS_BORDER[appt.status]}`,
                          opacity: rescheduling && dragId === appt.id ? 0.4 : 1,
                        }}
                        title={`${appt.customer.firstName} ${appt.customer.lastName} — ${appt.serviceName}`}
                      >
                        <div className="px-1.5 py-0.5">
                          <p className="text-[10px] font-semibold leading-tight truncate" style={{ color: STATUS_BORDER[appt.status] }}>
                            {appt.customer.firstName} {appt.customer.lastName}
                          </p>
                          {h > 28 && (
                            <p className="text-[9px] leading-tight truncate text-foreground/70">
                              {appt.serviceName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
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
  return ((minuteOfDay(isoStr, timezone) - START_HOUR * 60) * HOUR_HEIGHT) / 60;
}

function isoDateStr(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

interface Props {
  appointments: CalendarAppt[];
  anchorDate: Date;
  timezone: string;
  onAppointmentClick: (id: string) => void;
  onRescheduled: () => void;
}

export function DayView({ appointments, anchorDate, timezone, onAppointmentClick, onRescheduled }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [nowTop, setNowTop] = useState<number | null>(null);

  const dayStr = isoDateStr(anchorDate, timezone);
  const today = isoDateStr(new Date(), timezone);
  const isToday = dayStr === today;

  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(anchorDate);

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

  const dayAppts = appointments.filter(
    (a) => isoDateStr(new Date(a.startAt), timezone) === dayStr,
  );

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

  async function handleDrop(e: React.DragEvent) {
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

    setRescheduling(true);
    setDropError(null);
    try {
      const result = await rescheduleAppointment(id, dayStr, newTime);
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
      {/* Day header */}
      <div className="px-4 py-3 border-b border-border text-sm font-medium sticky top-0 bg-background z-10">
        {dayLabel}
      </div>

      {dropError && (
        <p role="alert" className="text-sm text-destructive px-4 py-1">{dropError}</p>
      )}

      <div className="overflow-y-auto flex-1">
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

          {/* Single day column */}
          <div
            className="flex-1 relative border-l border-border"
            style={{
              height: TOTAL_HOURS * HOUR_HEIGHT,
              background: isToday ? "rgba(var(--foreground-rgb,26,26,26), 0.025)" : undefined,
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {hourLabels.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-border/40"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
              />
            ))}

            {isToday && nowTop !== null && (
              <div
                className="absolute left-0 right-0 z-10 flex items-center"
                style={{ top: nowTop }}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                <div className="flex-1 border-t border-red-500" />
              </div>
            )}

            {dayAppts.map((appt) => {
              const top = topPx(appt.startAt, timezone);
              const h = (appt.durationMins * HOUR_HEIGHT) / 60;
              const buf = (appt.bufferMins * HOUR_HEIGHT) / 60;
              if (top + h < 0 || top > TOTAL_HOURS * HOUR_HEIGHT) return null;

              return (
                <div
                  key={appt.id}
                  className="absolute left-2 right-2"
                  style={{ top, height: h + buf }}
                >
                  {buf > 0 && (
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-b border border-dashed border-muted-foreground/20 bg-muted/30"
                      style={{ height: buf }}
                      title={`${appt.bufferMins} min buffer`}
                    />
                  )}
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
                    <div className="px-2 py-1">
                      <p className="text-xs font-semibold leading-tight" style={{ color: STATUS_BORDER[appt.status] }}>
                        {appt.customer.firstName} {appt.customer.lastName}
                      </p>
                      {h > 40 && (
                        <p className="text-[11px] leading-tight text-foreground/70 mt-0.5">
                          {appt.serviceName}
                        </p>
                      )}
                      {h > 60 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Intl.DateTimeFormat("en-GB", {
                            timeZone: timezone,
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }).format(new Date(appt.startAt))}
                          {" – "}
                          {new Intl.DateTimeFormat("en-GB", {
                            timeZone: timezone,
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }).format(new Date(appt.endAt))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppointmentStatus } from "@/lib/generated/prisma/client";
import type { CalendarAppt } from "@/lib/actions/calendar";

interface Appointment {
  id: string;
  status: AppointmentStatus;
  startAt: Date | string;
  serviceName: string;
  customer: { firstName: string; lastName: string };
}

interface Props {
  year: number;
  month: number;
  appointments: (Appointment | CalendarAppt)[];
  timezone?: string;
  onAppointmentClick?: (id: string) => void;
}

const STATUS_DOT: Record<AppointmentStatus, string> = {
  PENDING:    "#f59e0b",
  CONFIRMED:  "#22c55e",
  COMPLETED:  "#8b5cf6",
  CANCELLED:  "#ef4444",
  RESCHEDULED:"#0ea5e9",
  NO_SHOW:    "#71717a",
};

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function getMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

function prevMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function nextMonth(year: number, month: number) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function CalendarGrid({ year, month, appointments, timezone, onAppointmentClick }: Props) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  // JS getDay() is 0=Sunday; we want 0=Monday
  const startDow = (firstDay.getDay() + 6) % 7;

  const tz = timezone ?? "Europe/London";

  // Group appointments by day-of-month in business timezone
  const byDay: Record<number, (Appointment | CalendarAppt)[]> = {};
  for (const appt of appointments) {
    const d = new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric" })
      .format(new Date(appt.startAt));
    (byDay[parseInt(d)] ??= []).push(appt);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Build grid cells: leading blanks + days
  const cells: (number | null)[] = [...Array<null>(startDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  // Pad to full week rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/admin/calendar?year=${prev.year}&month=${prev.month}`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted/40 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
        <h2 className="text-base font-semibold">{getMonthLabel(year, month)}</h2>
        <Link
          href={`/admin/calendar?year=${next.year}&month=${next.month}`}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted/40 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {days.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border-l border-t border-border rounded-xl overflow-hidden">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`blank-${i}`} className="border-r border-b border-border bg-muted/20 min-h-[100px]" />;
          }

          const dayAppts = byDay[day] ?? [];
          const isToday = day === todayDay;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

          return (
            <div
              key={day}
              className="border-r border-b border-border min-h-[100px] p-1.5 group relative"
              style={isToday ? { background: "rgba(var(--foreground-rgb, 26, 26, 26), 0.04)" } : undefined}
            >
              {/* Day number */}
              <Link
                href={`/admin/appointments?date=${dateStr}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium transition-colors hover:bg-muted/60"
                style={isToday ? { background: "var(--foreground)", color: "var(--background)" } : undefined}
                aria-label={`View appointments for ${dateStr}`}
              >
                {day}
              </Link>

              {/* Appointments */}
              <div className="mt-1 space-y-0.5">
                {dayAppts.slice(0, 3).map((appt) => {
                  const label = `${appt.customer.firstName} ${appt.customer.lastName} — ${appt.serviceName}`;
                  const timeLabel = formatTime(new Date(appt.startAt));
                  const inner = (
                    <>
                      <span
                        className="shrink-0 h-1.5 w-1.5 rounded-full"
                        style={{ background: STATUS_DOT[appt.status] ?? "#999" }}
                        aria-hidden="true"
                      />
                      <span className="truncate text-foreground/80">
                        {timeLabel} {appt.customer.firstName}
                      </span>
                    </>
                  );
                  return onAppointmentClick ? (
                    <button
                      key={appt.id}
                      type="button"
                      onClick={() => onAppointmentClick(appt.id)}
                      className="w-full flex items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight hover:bg-muted/40 transition-colors truncate text-left"
                      aria-label={label}
                    >
                      {inner}
                    </button>
                  ) : (
                    <Link
                      key={appt.id}
                      href={`/admin/appointments/${appt.id}`}
                      className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight hover:bg-muted/40 transition-colors truncate"
                      aria-label={label}
                    >
                      {inner}
                    </Link>
                  );
                })}
                {dayAppts.length > 3 && (
                  <Link
                    href={`/admin/appointments?date=${dateStr}`}
                    className="block px-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    +{dayAppts.length - 3} more
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4">
        {(
          [
            { status: "PENDING", label: "Pending" },
            { status: "CONFIRMED", label: "Confirmed" },
            { status: "COMPLETED", label: "Completed" },
            { status: "NO_SHOW", label: "No-show" },
          ] as { status: AppointmentStatus; label: string }[]
        ).map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_DOT[status] }} aria-hidden="true" />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

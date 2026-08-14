"use client";

import type { CalendarAppt } from "@/lib/actions/calendar";
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

function isoDateStr(isoStr: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(isoStr));
}

function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatTime(isoStr: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoStr));
}

function formatGBP(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

interface Props {
  appointments: CalendarAppt[];
  timezone: string;
  onAppointmentClick: (id: string) => void;
}

export function AgendaView({ appointments, timezone, onAppointmentClick }: Props) {
  // Group by day
  const byDay = new Map<string, CalendarAppt[]>();
  for (const appt of appointments) {
    const ds = isoDateStr(appt.startAt, timezone);
    if (!byDay.has(ds)) byDay.set(ds, []);
    byDay.get(ds)!.push(appt);
  }

  const sortedDays = Array.from(byDay.keys()).sort();

  if (sortedDays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
        <p className="text-sm">No appointments in this period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1 divide-y divide-border">
      {sortedDays.map((ds) => {
        const dayAppts = byDay.get(ds)!;
        const isToday = ds === isoDateStr(new Date().toISOString(), timezone);

        return (
          <div key={ds} className="flex gap-4 p-4 sm:p-6">
            {/* Date label */}
            <div className="w-32 sm:w-40 shrink-0">
              <p className={`text-sm font-semibold ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
                {formatDayLabel(ds)}
              </p>
              {isToday && (
                <span className="text-xs text-primary font-medium">Today</span>
              )}
            </div>

            {/* Appointments */}
            <div className="flex-1 space-y-2">
              {dayAppts.map((appt) => (
                <button
                  key={appt.id}
                  type="button"
                  onClick={() => onAppointmentClick(appt.id)}
                  className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {appt.customer.firstName} {appt.customer.lastName}
                        </p>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{
                            background: STATUS_COLOR[appt.status] + "20",
                            color: STATUS_COLOR[appt.status],
                          }}
                        >
                          <span
                            className="h-1 w-1 rounded-full shrink-0"
                            style={{ background: STATUS_COLOR[appt.status] }}
                          />
                          {STATUS_LABEL[appt.status]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{appt.serviceName}</p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-xs font-medium tabular-nums">
                        {formatTime(appt.startAt, timezone)}
                        {" – "}
                        {formatTime(appt.endAt, timezone)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{appt.durationMins} min</p>
                      <p className="text-[11px] text-muted-foreground">{formatGBP(appt.pricePence)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

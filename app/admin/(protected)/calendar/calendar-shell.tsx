"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchCalendarRange } from "@/lib/actions/calendar";
import type { CalendarAppt } from "@/lib/actions/calendar";
import { CalendarGrid } from "./calendar-grid";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { AgendaView } from "./agenda-view";
import { AppointmentDrawer } from "./appointment-drawer";

type CalendarView = "month" | "week" | "day" | "agenda";

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: "month",  label: "Month"  },
  { key: "week",   label: "Week"   },
  { key: "day",    label: "Day"    },
  { key: "agenda", label: "Agenda" },
];

const APPOINTMENT_STATUSES = [
  { value: "ALL",         label: "All statuses" },
  { value: "PENDING",     label: "Pending"      },
  { value: "CONFIRMED",   label: "Confirmed"    },
  { value: "COMPLETED",   label: "Completed"    },
  { value: "CANCELLED",   label: "Cancelled"    },
  { value: "NO_SHOW",     label: "No-show"      },
];

interface ServiceOption {
  id: string;
  name: string;
}

interface Props {
  timezone: string;
  services: ServiceOption[];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function isoDateStr(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

function startOfWeek(date: Date, timezone: string): Date {
  const ds = isoDateStr(date, timezone);
  const [y, m, d] = ds.split("-").map(Number);
  const local = new Date(y, m - 1, d);
  const dow = (local.getDay() + 6) % 7;
  return new Date(y, m - 1, d - dow);
}

function getRangeForView(view: CalendarView, anchor: Date, timezone: string): { start: Date; end: Date } {
  if (view === "month") {
    const ds = isoDateStr(anchor, timezone);
    const [y, m] = ds.split("-").map(Number);
    return {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m, 1),
    };
  }
  if (view === "week") {
    const mon = startOfWeek(anchor, timezone);
    return {
      start: mon,
      end: addDays(mon, 7),
    };
  }
  if (view === "day") {
    const ds = isoDateStr(anchor, timezone);
    const [y, m, d] = ds.split("-").map(Number);
    return {
      start: new Date(y, m - 1, d),
      end: new Date(y, m - 1, d + 1),
    };
  }
  // agenda: 60 days ahead
  const ds = isoDateStr(anchor, timezone);
  const [y, m, d] = ds.split("-").map(Number);
  const from = new Date(y, m - 1, d);
  return { start: from, end: addDays(from, 60) };
}

function getHeaderLabel(view: CalendarView, anchor: Date, timezone: string): string {
  if (view === "month") {
    const ds = isoDateStr(anchor, timezone);
    const [y, m] = ds.split("-").map(Number);
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1));
  }
  if (view === "week") {
    const mon = startOfWeek(anchor, timezone);
    const sun = addDays(mon, 6);
    const monLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(mon);
    const sunLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(sun);
    return `${monLabel} – ${sunLabel}`;
  }
  if (view === "day") {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(anchor);
  }
  return "Next 60 days";
}

function navigate(view: CalendarView, anchor: Date, dir: 1 | -1): Date {
  if (view === "month") return addMonths(anchor, dir);
  if (view === "week")  return addDays(anchor, dir * 7);
  if (view === "day")   return addDays(anchor, dir);
  return addDays(anchor, dir * 30);
}

export function CalendarShell({ timezone, services }: Props) {
  const [view, setView] = useState<CalendarView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [appointments, setAppointments] = useState<CalendarAppt[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isTransitioning, startTransition] = useTransition();

  const fetchData = useCallback(
    (v: CalendarView, a: Date, sf: string, svc: string) => {
      const { start, end } = getRangeForView(v, a, timezone);
      startTransition(async () => {
        const data = await fetchCalendarRange(
          start.toISOString(),
          end.toISOString(),
          sf === "ALL" ? undefined : sf,
          svc || undefined,
        );
        setAppointments(data);
      });
    },
    [timezone],
  );

  // Re-fetch whenever view parameters change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(view, anchor, statusFilter, serviceFilter); }, [view, anchor, statusFilter, serviceFilter]);

  function handleNav(dir: 1 | -1) {
    setAnchor((a) => navigate(view, a, dir));
  }

  function handleToday() {
    setAnchor(new Date());
  }

  function handleViewChange(v: CalendarView) {
    setView(v);
  }

  function handleActionComplete() {
    fetchData(view, anchor, statusFilter, serviceFilter);
  }

  const headerLabel = getHeaderLabel(view, anchor, timezone);

  const monthData = view === "month" ? (() => {
    const ds = isoDateStr(anchor, timezone);
    const [y, m] = ds.split("-").map(Number);
    return { year: y, month: m };
  })() : null;

  const monthAppts = view === "month"
    ? appointments.map((a) => ({
        id: a.id,
        status: a.status,
        startAt: new Date(a.startAt),
        serviceName: a.serviceName,
        customer: a.customer,
      }))
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border bg-background shrink-0">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => handleNav(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleNav(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Header label */}
        <h2 className="text-sm font-semibold min-w-0 flex-1 truncate">{headerLabel}</h2>

        {/* Loading */}
        {isTransitioning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}

        {/* Filters */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="Filter by status"
        >
          {APPOINTMENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {services.length > 0 && (
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs max-w-[160px]"
            aria-label="Filter by service"
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        )}

        {/* iCal export */}
        <a
          href="/api/calendar"
          download="pherall-calendar.ics"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md border border-input bg-background hover:bg-muted/40 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </a>

        {/* View tabs */}
        <div className="flex rounded-md border border-border overflow-hidden ml-auto sm:ml-0">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => handleViewChange(v.key)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={
                view === v.key
                  ? { background: "var(--foreground)", color: "var(--background)" }
                  : { background: "transparent", color: "var(--muted-foreground)" }
              }
              aria-pressed={view === v.key}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {view === "month" && monthData && (
          <div className="overflow-y-auto h-full p-4 sm:p-6">
            <CalendarGrid
              year={monthData.year}
              month={monthData.month}
              appointments={monthAppts}
              timezone={timezone}
              onAppointmentClick={(id) => setSelectedId(id)}
            />
          </div>
        )}

        {view === "week" && (
          <WeekView
            appointments={appointments}
            anchorDate={anchor}
            timezone={timezone}
            onAppointmentClick={(id) => setSelectedId(id)}
            onRescheduled={handleActionComplete}
          />
        )}

        {view === "day" && (
          <DayView
            appointments={appointments}
            anchorDate={anchor}
            timezone={timezone}
            onAppointmentClick={(id) => setSelectedId(id)}
            onRescheduled={handleActionComplete}
          />
        )}

        {view === "agenda" && (
          <AgendaView
            appointments={appointments}
            timezone={timezone}
            onAppointmentClick={(id) => setSelectedId(id)}
          />
        )}
      </div>

      {/* Appointment drawer */}
      <AppointmentDrawer
        appointmentId={selectedId}
        onClose={() => setSelectedId(null)}
        onActionComplete={handleActionComplete}
        timezone={timezone}
      />
    </div>
  );
}

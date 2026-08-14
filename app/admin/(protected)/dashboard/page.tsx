import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  CalendarDays,
  Calendar,
  CreditCard,
  AlertCircle,
  CalendarPlus,
  Scissors,
  CalendarX,
  Globe,
  ArrowRight,
} from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { AppointmentStatusBadge } from "@/components/admin/appointment-status-badge";
import { getDashboardStats } from "@/lib/actions/appointments";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard — Pherall Admin" };

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(date);
}

export default async function DashboardPage() {
  const [session, stats, businessSettings] = await Promise.all([
    auth(),
    getDashboardStats(),
    db.businessSettings.findFirst({ select: { currency: true } }),
  ]);

  const name = session?.user?.name ?? session?.user?.email ?? "Admin";
  const firstName = name.split(/\s+/)[0];
  const currency = businessSettings?.currency ?? "GBP";

  return (
    <div className="px-6 py-8 md:px-8 max-w-6xl">
      {/* Welcome header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
          Welcome back
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{firstName}</h1>
      </div>

      {/* Overview stats */}
      <section aria-labelledby="stats-heading" className="mb-8">
        <h2 id="stats-heading" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            label="Today"
            value={String(stats.todayCount)}
            description="Appointments today"
            icon={CalendarDays}
            accentColor="#3b82f6"
          />
          <StatCard
            label="Upcoming"
            value={String(stats.upcomingCount)}
            description="Next 7 days"
            icon={Calendar}
            accentColor="#22c55e"
          />
          <StatCard
            label="Revenue"
            value={new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency,
              maximumFractionDigits: 0,
            }).format(stats.monthlyRevenuePence / 100)}
            description="Net revenue this month"
            icon={CreditCard}
            accentColor="#8b5cf6"
          />
          <StatCard
            label="Outstanding"
            value={new Intl.NumberFormat("en-GB", {
              style: "currency",
              currency,
              maximumFractionDigits: 0,
            }).format(stats.outstandingPence / 100)}
            description="Balance due at appointment"
            icon={AlertCircle}
            accentColor="#f59e0b"
          />
        </div>
      </section>

      {/* Schedule + upcoming */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's schedule */}
        <section aria-labelledby="schedule-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="schedule-heading" className="text-sm font-semibold">
              Today&apos;s Schedule
            </h2>
            <Link
              href="/admin/calendar"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View calendar
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          {stats.todayAppointments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-8 text-center">
              <CalendarDays className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-medium">No appointments today</p>
              <p className="text-xs text-muted-foreground mt-1">Manage your availability to accept bookings</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {stats.todayAppointments.map((appt) => (
                <Link
                  key={appt.id}
                  href={`/admin/appointments/${appt.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="text-center shrink-0 w-12">
                    <p className="text-xs font-semibold tabular-nums">{formatTime(appt.startAt)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {appt.customer.firstName} {appt.customer.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{appt.serviceName}</p>
                  </div>
                  <AppointmentStatusBadge status={appt.status} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming */}
        <section aria-labelledby="upcoming-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="upcoming-heading" className="text-sm font-semibold">
              Upcoming Appointments
            </h2>
            <Link
              href="/admin/appointments"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          {stats.upcomingAppointments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-8 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-medium">No upcoming appointments</p>
              <p className="text-xs text-muted-foreground mt-1">Confirmed bookings for the next 7 days appear here</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
              {stats.upcomingAppointments.map((appt) => (
                <Link
                  key={appt.id}
                  href={`/admin/appointments/${appt.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="text-center shrink-0 w-14">
                    <p className="text-[11px] text-muted-foreground">{formatDate(appt.startAt)}</p>
                    <p className="text-xs font-semibold tabular-nums">{formatTime(appt.startAt)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {appt.customer.firstName} {appt.customer.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{appt.serviceName}</p>
                  </div>
                  <AppointmentStatusBadge status={appt.status} size="sm" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Quick actions */}
      <section aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction href="/admin/appointments" icon={CalendarPlus} label="Appointments" description="View all bookings" />
          <QuickAction href="/admin/services/new" icon={Scissors} label="Add Service" description="Create a new service" />
          <QuickAction href="/admin/blocked-times" icon={CalendarX} label="Block Time" description="Mark unavailable" />
          <QuickAction href="/admin/content/homepage" icon={Globe} label="Edit Website" description="Update content" />
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted transition-colors group-hover:bg-background">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

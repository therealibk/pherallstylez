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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Dashboard — Pherall Admin" };

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "Admin";

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${name}.`}
      />

      {/* Overview stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Appointments"
          value="0"
          description="No appointments today"
          icon={CalendarDays}
        />
        <StatCard
          label="Upcoming Appointments"
          value="0"
          description="No upcoming appointments"
          icon={Calendar}
        />
        <StatCard
          label="Today's Revenue"
          value="£0.00"
          description="Available once payments are set up"
          icon={CreditCard}
        />
        <StatCard
          label="Outstanding Payments"
          value="£0.00"
          description="No outstanding payments"
          icon={AlertCircle}
        />
      </div>

      {/* Schedule and upcoming section */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={CalendarDays}
              title="No appointments today"
              description="When appointments are added, they will appear here."
              action={{ label: "View calendar", href: "/admin/calendar" }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Calendar}
              title="No upcoming appointments"
              description="Upcoming appointments for the next 7 days will appear here."
              action={{
                label: "View appointments",
                href: "/admin/appointments",
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction
            href="/admin/appointments"
            icon={CalendarPlus}
            label="Add Appointment"
          />
          <QuickAction
            href="/admin/services"
            icon={Scissors}
            label="Add Service"
          />
          <QuickAction
            href="/admin/blocked-times"
            icon={CalendarX}
            label="Block Time"
          />
          <QuickAction
            href="/admin/calendar"
            icon={Calendar}
            label="View Calendar"
          />
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Icon className="h-4 w-4" aria-hidden={true} />
      {label}
    </Link>
  );
}

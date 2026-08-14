import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { AppointmentStatusBadge } from "@/components/admin/appointment-status-badge";
import { listAppointments } from "@/lib/actions/appointments";
import type { AppointmentStatus } from "@/lib/generated/prisma/client";
import { AppointmentsFilterBar } from "./appointments-filter-bar";

export const metadata: Metadata = { title: "Appointments — Pherall Admin" };

const STATUS_TABS: { label: string; value: "ALL" | AppointmentStatus }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "No-show", value: "NO_SHOW" },
];

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

interface Props {
  searchParams: Promise<{ status?: string; date?: string; search?: string; page?: string }>;
}

export default async function AppointmentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = (STATUS_TABS.find((t) => t.value === params.status)?.value ?? "ALL") as "ALL" | AppointmentStatus;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const { appointments, total, pages } = await listAppointments({
    status,
    dateStr: params.date,
    search: params.search,
    page,
  });

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: params.status, date: params.date, search: params.search, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "ALL") p.set(k, v);
    }
    const qs = p.toString();
    return `/admin/appointments${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <PageHeader
        title="Appointments"
        description={`${total} appointment${total !== 1 ? "s" : ""} total`}
      />

      {/* Status tabs */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {STATUS_TABS.map((tab) => {
          const active = status === tab.value;
          return (
            <Link
              key={tab.value}
              href={buildUrl({ status: tab.value, page: undefined })}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              style={
                active
                  ? { background: "var(--foreground)", color: "var(--background)" }
                  : { color: "var(--muted-foreground)" }
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Filter bar (search + date) */}
      <AppointmentsFilterBar
        defaultSearch={params.search ?? ""}
        defaultDate={params.date ?? ""}
        currentStatus={status}
      />

      {/* Table */}
      {appointments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-16 text-center mt-4">
          <p className="text-sm font-medium">No appointments found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {params.search || params.date ? "Try adjusting your filters" : "Bookings will appear here once customers book"}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Date &amp; Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Service
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm whitespace-nowrap tabular-nums">
                      {formatDateTime(appt.startAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{appt.customer.firstName} {appt.customer.lastName}</p>
                      <p className="text-xs text-muted-foreground">{appt.customer.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{appt.serviceName}</td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(appt.pricePence)}</td>
                    <td className="px-4 py-3">
                      <AppointmentStatusBadge status={appt.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/appointments/${appt.id}`}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`View appointment for ${appt.customer.firstName} ${appt.customer.lastName}`}
                      >
                        View
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {page} of {pages} · {total} results
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={buildUrl({ page: String(page - 1) })}
                    className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/40 transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {page < pages && (
                  <Link
                    href={buildUrl({ page: String(page + 1) })}
                    className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/40 transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

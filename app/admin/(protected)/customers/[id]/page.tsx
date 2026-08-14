import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getCustomerById } from "@/lib/actions/customers";
import { AppointmentStatusBadge } from "@/components/admin/appointment-status-badge";
import { PaymentStatusBadge } from "@/components/admin/payment-status-badge";

export const metadata: Metadata = { title: "Customer — Pherall Admin" };

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
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
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  const totalSpend = customer.appointments.reduce((sum, a) => {
    const paid = a.payments
      .filter((p) => ["DEPOSIT_PAID", "PAID_IN_FULL"].includes(p.status))
      .reduce((s, p) => s + p.amountPence, 0);
    return sum + paid;
  }, 0);

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All customers
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {customer.firstName} {customer.lastName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Customer since {formatDate(customer.createdAt)}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Info sidebar */}
        <div className="space-y-6">
          <section aria-labelledby="info-heading" className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 id="info-heading" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Contact
              </h2>
            </div>
            <dl className="divide-y divide-border">
              <Row label="Email" value={customer.email} />
              {customer.phone && <Row label="Phone" value={customer.phone} />}
              {customer.notes && <Row label="Notes" value={customer.notes} />}
            </dl>
          </section>

          <section aria-labelledby="stats-heading" className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 id="stats-heading" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Stats
              </h2>
            </div>
            <dl className="divide-y divide-border">
              <Row label="Total bookings" value={String(customer.appointments.length)} />
              <Row label="Total spend" value={formatCurrency(totalSpend)} />
            </dl>
          </section>
        </div>

        {/* Appointment history */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold mb-3">Appointment History</h2>

          {customer.appointments.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No appointments yet</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <ul className="divide-y divide-border">
                {customer.appointments.map((appt) => {
                  const latestPayment = appt.payments[appt.payments.length - 1];
                  return (
                    <li key={appt.id} className="hover:bg-muted/30 transition-colors">
                      <Link
                        href={`/admin/appointments/${appt.id}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{appt.serviceName}</p>
                            <AppointmentStatusBadge status={appt.status} size="sm" />
                            {latestPayment && <PaymentStatusBadge status={latestPayment.status} size="sm" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(appt.startAt)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">{formatCurrency(appt.pricePence)}</p>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto mt-0.5" aria-hidden="true" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-5 py-3">
      <dt className="text-sm text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-sm text-right break-words min-w-0">{value}</dd>
    </div>
  );
}

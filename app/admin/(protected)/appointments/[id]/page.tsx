import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAppointmentDetail } from "@/lib/actions/appointments";
import { AppointmentStatusBadge } from "@/components/admin/appointment-status-badge";
import { PaymentStatusBadge } from "@/components/admin/payment-status-badge";
import { AppointmentTimeline } from "@/components/admin/appointment-timeline";
import { AppointmentActions } from "./appointment-actions";
import { NoteFormClient } from "./note-form-client";

export const metadata: Metadata = { title: "Appointment — Pherall Admin" };

function formatDateTime(date: Date, timezone?: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

function formatCurrency(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AppointmentDetailPage({ params }: Props) {
  const { id } = await params;
  const appt = await getAppointmentDetail(id);
  if (!appt) notFound();

  const balance = appt.pricePence - appt.depositPence;

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      {/* Back link */}
      <Link
        href="/admin/appointments"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All appointments
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {appt.customer.firstName} {appt.customer.lastName}
            </h1>
            <AppointmentStatusBadge status={appt.status} />
          </div>
          <p className="text-sm text-muted-foreground">{formatDateTime(appt.startAt, appt.timezone)}</p>
        </div>

        <AppointmentActions
          id={appt.id}
          status={appt.status}
          startAt={appt.startAt}
          timezone={appt.timezone}
          durationMins={appt.durationMins}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment summary */}
          <section aria-labelledby="appt-heading" className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 id="appt-heading" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Appointment
              </h2>
            </div>
            <dl className="divide-y divide-border">
              <Row label="Service" value={appt.serviceName} />
              <Row label="Date & time" value={formatDateTime(appt.startAt, appt.timezone)} />
              <Row label="Duration" value={`${appt.durationMins} min`} />
              {appt.bufferMins > 0 && <Row label="Buffer" value={`${appt.bufferMins} min`} />}
              <Row label="Price" value={formatCurrency(appt.pricePence)} />
              {appt.depositPence > 0 && <Row label="Deposit" value={formatCurrency(appt.depositPence)} />}
              {balance > 0 && balance < appt.pricePence && <Row label="Balance due" value={formatCurrency(balance)} />}
            </dl>
          </section>

          {/* Service answers */}
          {appt.answers.length > 0 && (
            <section aria-labelledby="answers-heading" className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 id="answers-heading" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Booking Questions
                </h2>
              </div>
              <dl className="divide-y divide-border">
                {appt.answers.map((ans, i) => (
                  <Row key={i} label={ans.questionLabel} value={ans.answer} />
                ))}
              </dl>
            </section>
          )}

          {/* Customer notes */}
          {appt.notes && (
            <section aria-labelledby="notes-heading" className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 id="notes-heading" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Customer Notes
                </h2>
              </div>
              <p className="px-5 py-4 text-sm text-muted-foreground whitespace-pre-wrap">{appt.notes}</p>
            </section>
          )}

          {/* Admin notes */}
          <section aria-labelledby="admin-notes-heading" className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 id="admin-notes-heading" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Internal Notes
              </h2>
            </div>
            <div className="px-5 py-4">
              <NoteFormClient id={appt.id} currentNote={appt.adminNotes ?? ""} />
            </div>
          </section>

          {/* Payments */}
          {appt.payments.length > 0 && (
            <section aria-labelledby="payments-heading" className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 id="payments-heading" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Payments
                </h2>
              </div>
              <ul className="divide-y divide-border">
                {appt.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium capitalize">{p.paymentType.toLowerCase().replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(p.amountPence)}
                        {p.paidAt
                          ? ` · ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(p.paidAt)}`
                          : ""}
                        {p.failureReason ? ` · ${p.failureReason}` : ""}
                      </p>
                    </div>
                    <PaymentStatusBadge status={p.status} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer info */}
          <section aria-labelledby="customer-heading" className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 id="customer-heading" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Customer
              </h2>
              <Link
                href={`/admin/customers/${appt.customer.id}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View profile
              </Link>
            </div>
            <dl className="divide-y divide-border">
              <Row label="Name" value={`${appt.customer.firstName} ${appt.customer.lastName}`} />
              <Row label="Email" value={appt.customer.email} />
              {appt.customer.phone && <Row label="Phone" value={appt.customer.phone} />}
              {appt.customer.notes && <Row label="Notes" value={appt.customer.notes} />}
            </dl>
          </section>

          {/* Activity timeline */}
          <section aria-labelledby="timeline-heading" className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 id="timeline-heading" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Activity
              </h2>
            </div>
            <div className="px-5 py-4">
              <AppointmentTimeline events={appt.events} />
            </div>
          </section>
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

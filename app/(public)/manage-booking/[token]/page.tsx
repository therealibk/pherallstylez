import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, Scissors, ArrowLeft } from "lucide-react";
import { getManageBookingData } from "@/lib/actions/manage-booking";
import { ManageBookingActions } from "./manage-booking-actions";
import { formatDuration } from "@/lib/service-format-utils";

export const metadata: Metadata = { title: "Manage your appointment" };

function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

function formatTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

function formatCurrency(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:    { label: "Awaiting confirmation", color: "#d97706" },
  CONFIRMED:  { label: "Confirmed",             color: "#15803d" },
  COMPLETED:  { label: "Completed",             color: "#4f46e5" },
  CANCELLED:  { label: "Cancelled",             color: "#dc2626" },
  NO_SHOW:    { label: "No-show",               color: "#52525b" },
  RESCHEDULED:{ label: "Rescheduled",           color: "#0284c7" },
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING:             "Awaiting payment",
  DEPOSIT_PAID:        "Deposit paid",
  PAID_IN_FULL:        "Paid in full",
  FAILED:              "Payment failed",
  REFUNDED:            "Refunded",
  PARTIALLY_REFUNDED:  "Partially refunded",
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ManageBookingPage({ params }: Props) {
  const { token } = await params;
  const data = await getManageBookingData(token);

  if (!data) notFound();

  const { appointment: appt, canCancel, canReschedule, cancellationDeadlineHours, reschedulingDeadlineHours } = data;
  const statusInfo = STATUS_LABELS[appt.status] ?? { label: appt.status, color: "#71717a" };
  const balance = appt.pricePence - appt.depositPence;

  // Determine payment to display — prefer PAID_IN_FULL > DEPOSIT_PAID > others
  const PAYMENT_PRIORITY: Record<string, number> = {
    PAID_IN_FULL: 0, PARTIALLY_REFUNDED: 1, DEPOSIT_PAID: 2, REFUNDED: 3, FAILED: 4, PENDING: 5,
  };
  const latestPayment = [...appt.payments].sort(
    (a, b) => (PAYMENT_PRIORITY[a.status] ?? 99) - (PAYMENT_PRIORITY[b.status] ?? 99),
  )[0] ?? null;

  return (
    <div className="min-h-screen" style={{ background: "var(--secondary, #f9fafb)" }}>
      {/* Simple header */}
      <header className="border-b border-border/50" style={{ background: "var(--background)" }}>
        <div className="mx-auto max-w-xl px-6 py-4 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-6 py-10">
        {/* Status */}
        <div className="mb-6 text-center">
          <div
            className="inline-flex items-center justify-center h-14 w-14 rounded-full mb-4"
            style={{ background: `${statusInfo.color}18` }}
          >
            <Scissors className="h-6 w-6" style={{ color: statusInfo.color }} aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Your Appointment</h1>
          <p className="text-sm mt-1" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </p>
        </div>

        {/* Appointment card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Appointment Details
            </p>
          </div>
          <dl className="divide-y divide-border">
            <Row label="Service" value={appt.serviceName} />
            <div className="flex justify-between gap-4 px-5 py-3">
              <dt className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                Date
              </dt>
              <dd className="text-sm text-right">{formatDate(appt.startAt, appt.timezone)}</dd>
            </div>
            <div className="flex justify-between gap-4 px-5 py-3">
              <dt className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Time
              </dt>
              <dd className="text-sm text-right">{formatTime(appt.startAt, appt.timezone)}</dd>
            </div>
            <Row label="Duration" value={formatDuration(appt.durationMins)} />
            <Row label="Price" value={formatCurrency(appt.pricePence)} />
            {appt.depositPence > 0 && <Row label="Deposit" value={formatCurrency(appt.depositPence)} />}
            {balance > 0 && balance < appt.pricePence && (
              <Row label="Balance due on day" value={formatCurrency(balance)} />
            )}
          </dl>
        </div>

        {/* Payment info — only shown when a payment record exists */}
        {latestPayment && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Payment
              </p>
            </div>
            <dl className="divide-y divide-border">
              <Row
                label="Status"
                value={PAYMENT_STATUS_LABELS[latestPayment.status] ?? latestPayment.status}
              />
              {(latestPayment.status === "DEPOSIT_PAID" ||
                latestPayment.status === "PAID_IN_FULL" ||
                latestPayment.status === "PARTIALLY_REFUNDED" ||
                latestPayment.status === "REFUNDED") && (
                <Row label="Amount paid" value={formatCurrency(latestPayment.amountPence)} />
              )}
              {latestPayment.status === "DEPOSIT_PAID" && balance > 0 && (
                <Row label="Remaining balance" value={formatCurrency(balance)} />
              )}
            </dl>
          </div>
        )}

        {/* Customer info */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Your Details
            </p>
          </div>
          <dl className="divide-y divide-border">
            <Row label="Name" value={`${appt.customer.firstName} ${appt.customer.lastName}`} />
            <Row label="Email" value={appt.customer.email} />
            {appt.customer.phone && <Row label="Phone" value={appt.customer.phone} />}
          </dl>
        </div>

        {/* Actions */}
        {(canCancel || canReschedule) && (
          <ManageBookingActions
            token={token}
            canCancel={canCancel}
            canReschedule={canReschedule}
            serviceSlug={appt.service.slug}
            cancellationDeadlineHours={cancellationDeadlineHours}
            reschedulingDeadlineHours={reschedulingDeadlineHours}
          />
        )}

        {!canCancel && !canReschedule && ["PENDING", "CONFIRMED"].includes(appt.status) && (
          <div className="rounded-xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground text-center">
            To make changes to your appointment, please contact us directly.
          </div>
        )}
      </main>
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

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getConfirmationData } from "@/lib/actions/booking";
import { formatGBP, formatDuration } from "@/lib/service-format-utils";

interface Props {
  params: Promise<{ token: string }>;
  // payment_session in searchParams is intentionally ignored — status is read from DB
}

function formatDateTime(utcDate: string, timezone: string): { date: string; time: string } {
  const d = new Date(utcDate);
  return {
    date: new Intl.DateTimeFormat("en-GB", { timeZone: timezone, dateStyle: "full" }).format(d),
    time: new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d),
  };
}

function AppointmentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    PENDING: { label: "Pending confirmation", style: { background: "#fef3c7", color: "#92400e" } },
    CONFIRMED: { label: "Confirmed", style: { background: "#d1fae5", color: "#065f46" } },
    CANCELLED: { label: "Cancelled", style: { background: "#fee2e2", color: "#991b1b" } },
  };
  const entry = map[status] ?? { label: status, style: {} };
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold"
      style={entry.style}
    >
      {entry.label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    PENDING: { label: "Awaiting payment", style: { background: "#fef3c7", color: "#92400e" } },
    DEPOSIT_PAID: { label: "Deposit paid", style: { background: "#d1fae5", color: "#065f46" } },
    PAID_IN_FULL: { label: "Paid in full", style: { background: "#d1fae5", color: "#065f46" } },
    FAILED: { label: "Payment failed", style: { background: "#fee2e2", color: "#991b1b" } },
    REFUNDED: { label: "Refunded", style: { background: "#f3f4f6", color: "#374151" } },
    PARTIALLY_REFUNDED: { label: "Partially refunded", style: { background: "#f3f4f6", color: "#374151" } },
  };
  const entry = map[status] ?? { label: status, style: {} };
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold"
      style={entry.style}
    >
      {entry.label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 flex flex-wrap gap-2 justify-between text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export default async function BookingConfirmationPage({ params }: Props) {
  const { token } = await params;

  if (!token || token.length < 10) notFound();

  const data = await getConfirmationData(token);
  if (!data) notFound();

  const tz = data.timezone ?? "Europe/London";
  const { date, time } = formatDateTime(data.startAt.toISOString(), tz);

  // Payment status is authoritative from DB — never from URL params
  const latestPayment = data.payments[0] ?? null;
  const isPaid =
    latestPayment?.status === "PAID_IN_FULL" || latestPayment?.status === "DEPOSIT_PAID";
  const isConfirmed = data.status === "CONFIRMED";

  // Determine header copy
  let headingText = "Booking received!";
  let subText = "Your appointment request has been submitted. You'll hear from us shortly to confirm.";

  if (isConfirmed && isPaid) {
    headingText = "Booking confirmed!";
    subText = "Your payment was received and your appointment is confirmed. See you then!";
  } else if (isConfirmed) {
    headingText = "Booking confirmed!";
    subText = "Your appointment is confirmed. We'll be in touch if anything changes.";
  } else if (latestPayment?.status === "FAILED") {
    headingText = "Payment failed";
    subText = "There was a problem processing your payment. Please try again below.";
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-xl mx-auto px-6 py-12 md:py-16 text-center">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-full text-2xl mb-5 font-semibold"
            style={{
              background:
                latestPayment?.status === "FAILED"
                  ? "#fee2e2"
                  : "var(--foreground)",
              color:
                latestPayment?.status === "FAILED"
                  ? "#991b1b"
                  : "var(--background)",
            }}
            aria-hidden="true"
          >
            {latestPayment?.status === "FAILED" ? "✕" : "✓"}
          </div>
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            {headingText}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {subText}
          </p>

          {/* Retry payment button if failed */}
          {latestPayment?.status === "FAILED" && (
            <div className="mt-5">
              <Link
                href={`/book/pay/${token}`}
                className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-85"
                style={{ background: "var(--foreground)", color: "var(--background)" }}
              >
                Try payment again
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10 md:py-14 space-y-4">
        {/* Appointment summary */}
        <div
          className="rounded-2xl border divide-y overflow-hidden text-sm"
          style={{ borderColor: "var(--border,#e5e7eb)" }}
        >
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Appointment summary
            </span>
            <AppointmentStatusBadge status={data.status} />
          </div>
          <Row label="Service" value={data.serviceName} />
          <Row label="Date" value={date} />
          <Row label="Time" value={time} />
          <Row label="Duration" value={formatDuration(data.durationMins)} />
          <Row label="Price" value={formatGBP(data.pricePence)} />
        </div>

        {/* Payment status panel — only when payment exists */}
        {latestPayment && (
          <div
            className="rounded-2xl border divide-y overflow-hidden text-sm"
            style={{ borderColor: "var(--border,#e5e7eb)" }}
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Payment
              </span>
              <PaymentStatusBadge status={latestPayment.status} />
            </div>
            <Row
              label="Amount"
              value={formatGBP(latestPayment.amountPence)}
            />
            <Row
              label="Type"
              value={
                latestPayment.paymentType === "DEPOSIT"
                  ? "Deposit"
                  : latestPayment.paymentType === "FULL"
                  ? "Full payment"
                  : "Remainder"
              }
            />
            {latestPayment.paidAt && (
              <Row
                label="Paid on"
                value={new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(latestPayment.paidAt)}
              />
            )}
            {/* Show remaining balance due if deposit paid */}
            {latestPayment.status === "DEPOSIT_PAID" && data.depositPence != null && (
              <Row
                label="Balance due at appointment"
                value={formatGBP(data.pricePence - data.depositPence)}
              />
            )}
          </div>
        )}

        {/* Customer details */}
        <div
          className="rounded-2xl border divide-y overflow-hidden text-sm"
          style={{ borderColor: "var(--border,#e5e7eb)" }}
        >
          <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Your details
          </div>
          <Row label="Name" value={`${data.customer.firstName} ${data.customer.lastName}`} />
          <Row label="Email" value={data.customer.email} />
          {data.customer.phone && <Row label="Phone" value={data.customer.phone} />}
        </div>

        {/* Bookmark prompt */}
        <div
          className="rounded-2xl border border-dashed px-5 py-4 text-sm text-muted-foreground text-center leading-relaxed"
          style={{ borderColor: "var(--border,#e5e7eb)" }}
        >
          <strong style={{ color: "var(--foreground)" }}>Bookmark this page</strong> — it&apos;s
          your appointment link. We&apos;ll also follow up by email.
        </div>

        {/* Browse more services */}
        <div className="flex justify-center pt-2">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: "var(--foreground)" }}
          >
            Browse all services
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

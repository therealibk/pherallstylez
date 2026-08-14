import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getConfirmationData } from "@/lib/actions/booking";
import { formatGBP, formatDuration } from "@/lib/service-format-utils";

interface Props {
  params: Promise<{ token: string }>;
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    PENDING: {
      label: "Pending confirmation",
      style: { background: "#fef3c7", color: "#92400e" },
    },
    CONFIRMED: {
      label: "Confirmed",
      style: { background: "#d1fae5", color: "#065f46" },
    },
    CANCELLED: {
      label: "Cancelled",
      style: { background: "#fee2e2", color: "#991b1b" },
    },
  };
  const entry = map[status] ?? {
    label: status,
    style: {},
  };
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

  return (
    <div>
      {/* Success header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-xl mx-auto px-6 py-12 md:py-16 text-center">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-full text-2xl mb-5 font-semibold"
            style={{
              background: "var(--foreground)",
              color: "var(--background)",
            }}
            aria-hidden="true"
          >
            ✓
          </div>
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Booking received!
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Your appointment request has been submitted. You&apos;ll hear from us shortly to confirm.
          </p>
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
            <StatusBadge status={data.status} />
          </div>
          <Row label="Service" value={data.serviceName} />
          <Row label="Date" value={date} />
          <Row label="Time" value={time} />
          <Row label="Duration" value={formatDuration(data.durationMins)} />
          <Row label="Price" value={formatGBP(data.pricePence)} />
          {data.depositPence != null && data.depositPence > 0 && (
            <Row label="Deposit due" value={formatGBP(data.depositPence)} />
          )}
        </div>

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

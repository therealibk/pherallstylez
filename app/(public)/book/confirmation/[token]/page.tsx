import { notFound } from "next/navigation";
import { getConfirmationData } from "@/lib/actions/booking";
import { formatGBP, formatDuration } from "@/lib/service-format-utils";

interface Props {
  params: Promise<{ token: string }>;
}

function formatDateTime(utcDate: string, timezone: string): { date: string; time: string } {
  const d = new Date(utcDate);
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    dateStyle: "full",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return { date, time };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; classes: string }> = {
    PENDING: { label: "Pending confirmation", classes: "bg-amber-100 text-amber-800" },
    CONFIRMED: { label: "Confirmed", classes: "bg-green-100 text-green-800" },
    CANCELLED: { label: "Cancelled", classes: "bg-red-100 text-red-800" },
  };
  const { label, classes } = map[status] ?? { label: status, classes: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${classes}`}>
      {label}
    </span>
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
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* Success header */}
      <div className="text-center mb-10">
        <div
          className="inline-flex h-16 w-16 items-center justify-center rounded-full text-3xl mb-4"
          style={{ background: "color-mix(in srgb, var(--button, #1a1a1a) 12%, transparent)" }}
          aria-hidden="true"
        >
          ✓
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Booking received!</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
          Your appointment request has been submitted. You&apos;ll hear from us shortly.
        </p>
      </div>

      {/* Appointment card */}
      <div className="rounded-xl border divide-y text-sm mb-6">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
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

      {/* Customer card */}
      <div className="rounded-xl border divide-y text-sm mb-8">
        <div className="px-4 py-3 font-medium text-xs uppercase tracking-wider text-muted-foreground">
          Your details
        </div>
        <Row
          label="Name"
          value={`${data.customer.firstName} ${data.customer.lastName}`}
        />
        <Row label="Email" value={data.customer.email} />
        {data.customer.phone && <Row label="Phone" value={data.customer.phone} />}
      </div>

      {/* Save link prompt */}
      <div className="rounded-xl border border-dashed px-4 py-4 text-sm text-muted-foreground text-center">
        <p>
          <strong className="text-foreground">Bookmark this page</strong> — it&apos;s your
          appointment management link. We&apos;ll also follow up by email.
        </p>
      </div>
    </div>
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

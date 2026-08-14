import { notFound, redirect } from "next/navigation";
import { createHash } from "crypto";
import { CreditCard } from "lucide-react";
import { db } from "@/lib/db";
import { PayOptionsClient } from "./pay-options-client";

interface Props {
  params: Promise<{ token: string }>;
}

function formatCurrency(pence: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(pence / 100);
}

function formatDateTime(date: Date, timezone: string): { date: string; time: string } {
  return {
    date: new Intl.DateTimeFormat("en-GB", { timeZone: timezone, dateStyle: "full" }).format(date),
    time: new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

export default async function PaymentPage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 10) notFound();

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const tokenRecord = await db.appointmentToken.findUnique({
    where: { tokenHash },
    select: {
      revoked: true,
      expiresAt: true,
      appointment: {
        select: {
          id: true,
          status: true,
          serviceName: true,
          pricePence: true,
          depositPence: true,
          timezone: true,
          startAt: true,
          payments: {
            select: { status: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!tokenRecord || tokenRecord.revoked) notFound();
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) notFound();

  const appt = tokenRecord.appointment;
  if (!appt) notFound();

  // If already confirmed/cancelled, redirect to confirmation page
  if (appt.status !== "PENDING") {
    redirect(`/book/confirmation/${token}`);
  }

  // If already fully paid, redirect to confirmation
  const latestPayment = appt.payments[0];
  if (
    latestPayment &&
    (latestPayment.status === "PAID_IN_FULL" || latestPayment.status === "DEPOSIT_PAID")
  ) {
    redirect(`/book/confirmation/${token}`);
  }

  const [bookingSettings, businessSettings] = await Promise.all([
    db.bookingSettings.findFirst({ select: { depositRequired: true } }),
    db.businessSettings.findFirst({ select: { currency: true } }),
  ]);

  const depositRequired = bookingSettings?.depositRequired ?? true;
  const currency = businessSettings?.currency ?? "GBP";

  const canPayDeposit = appt.depositPence > 0 && appt.depositPence < appt.pricePence;
  const balanceDue = appt.pricePence - appt.depositPence;

  const { date, time } = formatDateTime(appt.startAt, appt.timezone);

  // Build deposit label
  let depositLabel: string | null = null;
  if (canPayDeposit) {
    depositLabel = `Pay ${formatCurrency(appt.depositPence, currency)} today · ${formatCurrency(balanceDue, currency)} balance at appointment`;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-xl mx-auto px-6 py-10 md:py-12">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: "var(--foreground)", color: "var(--background)" }}
              aria-hidden="true"
            >
              <CreditCard className="h-4 w-4" />
            </div>
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              Complete payment
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Your booking is reserved. Choose a payment option to confirm your appointment.
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10 md:py-12 space-y-6">
        {/* Appointment summary */}
        <div
          className="rounded-2xl border divide-y text-sm overflow-hidden"
          style={{ borderColor: "var(--border,#e5e7eb)" }}
        >
          <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Your appointment
          </div>
          {[
            { label: "Service", value: appt.serviceName },
            { label: "Date", value: date },
            { label: "Time", value: time },
            { label: "Total price", value: formatCurrency(appt.pricePence, currency) },
            ...(canPayDeposit
              ? [
                  { label: "Deposit", value: formatCurrency(appt.depositPence, currency) },
                  { label: "Balance due", value: formatCurrency(balanceDue, currency) },
                ]
              : []),
          ].map(({ label, value }) => (
            <div
              key={label}
              className="px-4 py-3 flex flex-wrap gap-2 justify-between"
            >
              <span className="text-muted-foreground shrink-0">{label}</span>
              <span className="font-medium text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* Payment options */}
        <div>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--foreground)" }}>
            Choose payment option
          </h2>
          <PayOptionsClient
            rawToken={token}
            depositPence={appt.depositPence}
            pricePence={appt.pricePence}
            depositRequired={depositRequired}
            depositLabel={depositLabel}
            currency={currency}
          />
        </div>
      </div>
    </div>
  );
}

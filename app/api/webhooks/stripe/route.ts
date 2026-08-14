import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, resolveWebhookSecret } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/email";

export const runtime = "nodejs";

// Disable body parsing — Stripe requires the raw body for signature verification
export const dynamic = "force-dynamic";

async function getBusinessName(): Promise<string> {
  const s = await db.businessSettings.findFirst({ select: { businessName: true } });
  return s?.businessName ?? "Pherall";
}

/**
 * Stripe webhook endpoint.
 * Signature is verified BEFORE any business logic runs.
 * All business logic runs inside a single DB transaction for idempotency.
 * A committed StripeWebhookEvent row always means the event was processed.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const webhookSecret = await resolveWebhookSecret();
  if (!webhookSecret) {
    console.error("[webhook/stripe] Webhook secret not configured (set in Admin → Settings → Payments or STRIPE_WEBHOOK_SECRET env var)");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = await getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook/stripe] Signature verification failed:", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency check — try to insert event record first
  // If already committed (processed=true), skip silently
  const existing = await db.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (existing?.processed) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    await db.$transaction(async (tx) => {
      // Reserve this event atomically — if another process already committed it, this upsert
      // returns the existing row and we re-check below
      await tx.stripeWebhookEvent.upsert({
        where: { stripeEventId: event.id },
        update: {},
        create: {
          stripeEventId: event.id,
          eventType: event.type,
          processed: false,
        },
      });

      // Re-check inside transaction for race-condition safety
      const record = await tx.stripeWebhookEvent.findUnique({
        where: { stripeEventId: event.id },
        select: { processed: true },
      });
      if (record?.processed) return; // Already done, skip

      await handleEvent(event, tx);

      await tx.stripeWebhookEvent.update({
        where: { stripeEventId: event.id },
        data: { processed: true, processedAt: new Date() },
      });
    });
  } catch (err) {
    console.error(`[webhook/stripe] Processing failed for ${event.id}:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── Event handlers ────────────────────────────────────────────────────────────

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function handleEvent(event: Stripe.Event, tx: TxClient): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, tx);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, tx);
      break;

    case "charge.refunded":
      await handleChargeRefunded(event.data.object as Stripe.Charge, tx);
      break;

    default:
      // Unhandled event type — acknowledge without error
      break;
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  tx: TxClient,
): Promise<void> {
  const { appointmentId, paymentId, paymentType, rawToken } = session.metadata ?? {};
  if (!appointmentId || !paymentId) {
    console.warn("[webhook/stripe] checkout.session.completed missing metadata");
    return;
  }

  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, amountPence: true, appointmentId: true },
  });
  if (!payment) {
    console.warn(`[webhook/stripe] Payment ${paymentId} not found`);
    return;
  }

  // Idempotent: if already paid, skip
  if (payment.status === "PAID_IN_FULL" || payment.status === "DEPOSIT_PAID") return;

  const newPaymentStatus = paymentType === "DEPOSIT" ? "DEPOSIT_PAID" : "PAID_IN_FULL";

  // Update payment: status, stripeIds, paidAt
  await tx.payment.update({
    where: { id: payment.id },
    data: {
      status: newPaymentStatus,
      paidAt: new Date(),
      stripePaymentIntentId: session.payment_intent as string ?? undefined,
      stripeChargeId: typeof session.payment_intent === "string"
        ? undefined
        : undefined,
    },
  });

  // Confirm appointment (PENDING → CONFIRMED)
  const appt = await tx.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      status: true,
      serviceName: true,
      startAt: true,
      timezone: true,
      pricePence: true,
      depositPence: true,
      customer: { select: { firstName: true, email: true } },
    },
  });
  if (!appt) return;

  if (appt.status === "PENDING") {
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: "CONFIRMED" },
    });

    await tx.appointmentEvent.create({
      data: {
        appointmentId,
        eventType: "CONFIRMED",
        description: `Appointment confirmed after ${paymentType === "DEPOSIT" ? "deposit" : "full"} payment`,
        metadata: { stripeSessionId: session.id },
      },
    });
  }

  await tx.appointmentEvent.create({
    data: {
      appointmentId,
      eventType: "PAYMENT_RECEIVED",
      description: `Payment of £${(payment.amountPence / 100).toFixed(2)} received (${paymentType === "DEPOSIT" ? "deposit" : "full payment"})`,
      metadata: { stripeSessionId: session.id, amountPence: payment.amountPence },
    },
  });

  // Fire-and-forget email after transaction (cannot use tx inside sendNotification)
  setImmediate(async () => {
    const businessName = await getBusinessName();
    if (rawToken) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      void sendNotification({
        appointmentId,
        type: "PAYMENT_CONFIRMATION",
        recipientEmail: appt.customer.email,
        deduplicationKey: `PAYMENT_CONFIRMATION:${appointmentId}:${paymentId}`,
        data: {
          customerFirstName: appt.customer.firstName,
          customerEmail: appt.customer.email,
          serviceName: appt.serviceName,
          startAt: appt.startAt,
          timezone: appt.timezone,
          pricePence: appt.pricePence,
          depositPence: appt.depositPence,
          businessName,
          manageUrl: `${appUrl}/manage-booking/${rawToken}`,
        },
      });
    }
  });
}

async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  tx: TxClient,
): Promise<void> {
  const payment = await tx.payment.findFirst({
    where: { stripePaymentIntentId: paymentIntent.id },
    select: { id: true, status: true, appointmentId: true, amountPence: true },
  });
  if (!payment) return;
  if (payment.status === "FAILED") return; // Already handled

  const failureReason =
    paymentIntent.last_payment_error?.message ?? "Payment failed";

  await tx.payment.update({
    where: { id: payment.id },
    data: { status: "FAILED", failureReason: failureReason.slice(0, 500) },
  });

  await tx.appointmentEvent.create({
    data: {
      appointmentId: payment.appointmentId,
      eventType: "PAYMENT_FAILED",
      description: `Payment failed: ${failureReason.slice(0, 200)}`,
      metadata: { stripePaymentIntentId: paymentIntent.id, amountPence: payment.amountPence },
    },
  });
}

async function handleChargeRefunded(
  charge: Stripe.Charge,
  tx: TxClient,
): Promise<void> {
  // Find payment by payment intent ID
  const payment = await tx.payment.findFirst({
    where: { stripePaymentIntentId: charge.payment_intent as string },
    select: {
      id: true,
      status: true,
      amountPence: true,
      appointmentId: true,
      refunds: { select: { stripeRefundId: true, amountPence: true, status: true } },
    },
  });
  if (!payment) return;

  // Sync all refunds on this charge
  for (const stripeRefund of charge.refunds?.data ?? []) {
    const existing = payment.refunds.find((r) => r.stripeRefundId === stripeRefund.id);
    if (existing?.status === "SUCCEEDED") continue; // Already processed

    if (!existing) {
      // Refund created outside of our admin flow (e.g. Stripe dashboard)
      await tx.refund.create({
        data: {
          paymentId: payment.id,
          amountPence: stripeRefund.amount,
          currency: stripeRefund.currency.toUpperCase(),
          stripeRefundId: stripeRefund.id,
          status: stripeRefund.status === "succeeded" ? "SUCCEEDED" : "PENDING",
          processedAt: stripeRefund.status === "succeeded" ? new Date() : null,
        },
      });
    } else {
      // Update status of an existing refund
      await tx.refund.update({
        where: { stripeRefundId: stripeRefund.id },
        data: {
          status: stripeRefund.status === "succeeded" ? "SUCCEEDED" : "PENDING",
          processedAt: stripeRefund.status === "succeeded" ? new Date() : null,
        },
      });
    }
  }

  // Recalculate payment status from all refunds
  const allRefunds = charge.refunds?.data ?? [];
  const totalRefunded = allRefunds
    .filter((r) => r.status === "succeeded")
    .reduce((sum, r) => sum + r.amount, 0);

  let newStatus = payment.status;
  if (totalRefunded >= payment.amountPence) {
    newStatus = "REFUNDED";
  } else if (totalRefunded > 0) {
    newStatus = "PARTIALLY_REFUNDED";
  }

  if (newStatus !== payment.status) {
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: newStatus },
    });

    await tx.appointmentEvent.create({
      data: {
        appointmentId: payment.appointmentId,
        eventType: "REFUND_ISSUED",
        description: `Refund of £${(totalRefunded / 100).toFixed(2)} processed`,
        metadata: { stripeChargeId: charge.id, totalRefunded },
      },
    });
  }
}

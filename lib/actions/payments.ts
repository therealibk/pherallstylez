"use server";

import { createHash } from "crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { sendNotification } from "@/lib/email";

type FailResult = { success: false; error: string };

async function requireAdmin(): Promise<true | FailResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };
  return true;
}

// ── Create Stripe Checkout session ────────────────────────────────────────────

const checkoutSchema = z.object({
  rawToken: z.string().min(10).max(200),
  paymentType: z.enum(["DEPOSIT", "FULL"]),
});

export async function createCheckoutSession(
  rawToken: string,
  paymentType: "DEPOSIT" | "FULL",
): Promise<{ success: true; url: string } | FailResult> {
  const parsed = checkoutSchema.safeParse({ rawToken, paymentType });
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Resolve token → appointment (server-side, never trust client amount)
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const tokenRecord = await db.appointmentToken.findUnique({
    where: { tokenHash },
    select: {
      revoked: true,
      expiresAt: true,
      appointment: {
        select: {
          id: true,
          status: true,
          pricePence: true,
          depositPence: true,
          serviceName: true,
          customer: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  if (!tokenRecord) return { success: false, error: "Invalid booking link" };
  if (tokenRecord.revoked) return { success: false, error: "This booking link has expired" };
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
    return { success: false, error: "This booking link has expired" };
  }

  const appt = tokenRecord.appointment;
  if (!appt) return { success: false, error: "Appointment not found" };

  // Only PENDING appointments can initiate payment
  if (appt.status !== "PENDING") {
    return { success: false, error: "Payment is only available for pending appointments" };
  }

  // Calculate amount server-side from authoritative DB values — never trust client
  const amountPence =
    paymentType === "DEPOSIT" ? appt.depositPence : appt.pricePence;

  if (amountPence <= 0) {
    return { success: false, error: "Invalid payment amount" };
  }

  const businessSettings = await db.businessSettings.findFirst({
    select: { currency: true, businessName: true },
  });
  const currency = (businessSettings?.currency ?? "GBP").toLowerCase();

  const stripe = getStripe();

  // Create Payment record first (PENDING) with idempotency key
  const idempotencyKey = `checkout:${appt.id}:${paymentType}`;
  let payment;
  try {
    payment = await db.payment.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        appointmentId: appt.id,
        status: "PENDING",
        paymentType,
        amountPence,
        currency: currency.toUpperCase(),
        idempotencyKey,
      },
    });
  } catch {
    return { success: false, error: "Payment record could not be created. Please try again." };
  }

  // Create Stripe Checkout Session
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountPence,
            product_data: {
              name: appt.serviceName,
              description:
                paymentType === "DEPOSIT"
                  ? `Deposit payment for ${appt.serviceName}`
                  : `Full payment for ${appt.serviceName}`,
            },
          },
        },
      ],
      customer_email: appt.customer.email,
      metadata: {
        appointmentId: appt.id,
        paymentId: payment.id,
        paymentType,
        rawToken,
      },
      success_url: `${appUrl}/book/confirmation/${rawToken}?payment_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/book/pay/${rawToken}`,
    });

    if (!session.url) {
      return { success: false, error: "Failed to create payment session. Please try again." };
    }

    // Store the Stripe session/payment intent ID on the payment record
    await db.payment.update({
      where: { id: payment.id },
      data: {
        stripePaymentIntentId: session.payment_intent as string | null ?? session.id,
      },
    });

    return { success: true, url: session.url };
  } catch (err) {
    console.error("[createCheckoutSession] Stripe error:", err);
    return { success: false, error: "Payment session could not be created. Please try again." };
  }
}

// ── Get payment status for an appointment (by token) ─────────────────────────

export async function getPaymentStatusForToken(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const tokenRecord = await db.appointmentToken.findUnique({
    where: { tokenHash },
    select: {
      appointment: {
        select: {
          id: true,
          status: true,
          payments: {
            select: { id: true, status: true, paymentType: true, amountPence: true, paidAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  return tokenRecord?.appointment ?? null;
}

// ── Issue refund (admin only) ─────────────────────────────────────────────────

const refundSchema = z.object({
  paymentId: z.string().cuid(),
  amountPence: z.number().int().positive().optional(),
  reason: z.string().max(500).optional(),
});

export async function issueRefund(
  paymentId: string,
  amountPence?: number,
  reason?: string,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = refundSchema.safeParse({ paymentId, amountPence, reason });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Load payment with all existing refunds (to check refundable amount)
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      status: true,
      amountPence: true,
      currency: true,
      stripePaymentIntentId: true,
      stripeChargeId: true,
      refunds: { select: { amountPence: true, status: true } },
      appointment: {
        select: {
          id: true,
          serviceName: true,
          startAt: true,
          timezone: true,
          pricePence: true,
          depositPence: true,
          customer: { select: { firstName: true, email: true } },
        },
      },
    },
  });

  if (!payment) return { success: false, error: "Payment not found" };

  const refundableStatuses = ["DEPOSIT_PAID", "PAID_IN_FULL", "PARTIALLY_REFUNDED"] as const;
  if (!refundableStatuses.includes(payment.status as typeof refundableStatuses[number])) {
    return { success: false, error: `Cannot refund a payment with status: ${payment.status}` };
  }

  if (!payment.stripePaymentIntentId) {
    return { success: false, error: "No Stripe payment associated with this record" };
  }

  // Calculate already-refunded amount
  const alreadyRefunded = payment.refunds
    .filter((r) => r.status !== "FAILED")
    .reduce((sum, r) => sum + r.amountPence, 0);

  const maxRefundable = payment.amountPence - alreadyRefunded;
  if (maxRefundable <= 0) {
    return { success: false, error: "This payment has already been fully refunded" };
  }

  // Server validates refund amount — never allow over-refund
  const refundAmount = parsed.data.amountPence ?? maxRefundable;
  if (refundAmount > maxRefundable) {
    return {
      success: false,
      error: `Refund amount (£${(refundAmount / 100).toFixed(2)}) exceeds refundable balance (£${(maxRefundable / 100).toFixed(2)})`,
    };
  }

  const stripe = getStripe();

  try {
    // Look up the charge ID from the payment intent
    let chargeId = payment.stripeChargeId;
    if (!chargeId) {
      const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
        expand: ["latest_charge"],
      });
      const charge = pi.latest_charge;
      if (charge && typeof charge === "object" && "id" in charge) {
        chargeId = (charge as { id: string }).id;
        await db.payment.update({
          where: { id: payment.id },
          data: { stripeChargeId: chargeId },
        });
      }
    }

    const stripeRefund = await stripe.refunds.create({
      ...(chargeId
        ? { charge: chargeId }
        : { payment_intent: payment.stripePaymentIntentId }),
      amount: refundAmount,
      reason: "requested_by_customer",
      metadata: {
        paymentId: payment.id,
        appointmentId: payment.appointment.id,
        adminReason: parsed.data.reason ?? "",
      },
    });

    // Create Refund record and update Payment status atomically
    const newTotalRefunded = alreadyRefunded + refundAmount;
    const newStatus =
      newTotalRefunded >= payment.amountPence ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await db.$transaction([
      db.refund.create({
        data: {
          paymentId: payment.id,
          amountPence: refundAmount,
          currency: payment.currency,
          stripeRefundId: stripeRefund.id,
          status: stripeRefund.status === "succeeded" ? "SUCCEEDED" : "PENDING",
          reason: parsed.data.reason,
          processedAt: stripeRefund.status === "succeeded" ? new Date() : null,
        },
      }),
      db.payment.update({
        where: { id: payment.id },
        data: { status: newStatus },
      }),
      db.appointmentEvent.create({
        data: {
          appointmentId: payment.appointment.id,
          eventType: "REFUND_ISSUED",
          description: `Refund of £${(refundAmount / 100).toFixed(2)} issued`,
          metadata: {
            stripeRefundId: stripeRefund.id,
            amountPence: refundAmount,
            reason: parsed.data.reason,
          },
        },
      }),
    ]);

    // Send refund confirmation email (fire-and-forget)
    const business = await db.businessSettings.findFirst({
      select: { businessName: true },
    });
    if (business) {
      void sendNotification({
        appointmentId: payment.appointment.id,
        type: "REFUND_CONFIRMATION",
        recipientEmail: payment.appointment.customer.email,
        deduplicationKey: `REFUND_CONFIRMATION:${payment.id}:${stripeRefund.id}`,
        data: {
          customerFirstName: payment.appointment.customer.firstName,
          customerEmail: payment.appointment.customer.email,
          serviceName: payment.appointment.serviceName,
          startAt: payment.appointment.startAt,
          timezone: payment.appointment.timezone,
          pricePence: payment.appointment.pricePence,
          depositPence: payment.appointment.depositPence,
          businessName: business.businessName,
        },
      });
    }

    return { success: true };
  } catch (err) {
    console.error("[issueRefund] Stripe error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Refund failed: ${msg.slice(0, 200)}` };
  }
}

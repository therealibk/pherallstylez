"use server";

import { headers } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  isSlotAvailable,
  wallClockToUtc,
  utcToDateStr,
  expandBlockedPeriods,
} from "@/lib/availability";
import { bookingRequestSchema } from "@/lib/booking-schemas";
import {
  AppointmentStatus,
  AppointmentEventType,
} from "@/lib/generated/prisma/client";
import {
  calculateDepositPence,
  makeLockKey,
  validateAnswers,
} from "@/lib/booking-utils";
import { sendNotification } from "@/lib/email";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BookingResult =
  | { success: true; token: string }
  | { success: false; error: string };

export interface SerializedQuestionOption {
  id: string;
  label: string;
  displayOrder: number;
}

export interface SerializedQuestion {
  id: string;
  label: string;
  questionType: string;
  required: boolean;
  displayOrder: number;
  options: SerializedQuestionOption[];
}

export interface SerializedPolicy {
  type: string;
  title: string;
  content: string;
  version: number;
}

export interface BookingPageData {
  service: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    pricePence: number;
    depositType: string;
    depositPence: number | null;
    depositPercentage: number | null;
    durationMins: number;
    bufferMins: number;
    preparationNotes: string | null;
    questions: SerializedQuestion[];
  };
  policies: SerializedPolicy[];
  timezone: string;
}

// ── Data loaders ──────────────────────────────────────────────────────────────

/**
 * Load everything needed to render the booking confirm flow.
 * Returns null if the service is not found or inactive.
 */
export async function getBookingPageData(
  serviceSlug: string,
): Promise<BookingPageData | null> {
  const [service, policies, businessSettings] = await Promise.all([
    db.service.findUnique({
      where: { slug: serviceSlug, active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        pricePence: true,
        depositType: true,
        depositPence: true,
        depositPercentage: true,
        durationMins: true,
        bufferMins: true,
        preparationNotes: true,
        questions: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            label: true,
            questionType: true,
            required: true,
            displayOrder: true,
            options: {
              orderBy: { displayOrder: "asc" },
              select: { id: true, label: true, displayOrder: true },
            },
          },
        },
      },
    }),
    db.policy.findMany({
      where: { published: true },
      select: { type: true, title: true, content: true, version: true },
    }),
    db.businessSettings.findFirst({ select: { timezone: true } }),
  ]);

  if (!service) return null;

  // Sort policies: Booking Policy first, then Refund, then Cancellation, others after
  const POLICY_ORDER: Record<string, number> = {
    BOOKING_POLICY: 0,
    REFUND_POLICY: 1,
    CANCELLATION_POLICY: 2,
    APPOINTMENT_POLICY: 3,
    TERMS_AND_CONDITIONS: 4,
    PRIVACY_POLICY: 5,
  };
  const sortedPolicies = [...policies].sort(
    (a, b) => (POLICY_ORDER[a.type as string] ?? 99) - (POLICY_ORDER[b.type as string] ?? 99),
  );

  return {
    service: {
      ...service,
      depositType: service.depositType as string,
      questions: service.questions.map((q) => ({
        ...q,
        questionType: q.questionType as string,
      })),
    },
    policies: sortedPolicies.map((p) => ({ ...p, type: p.type as string })),
    timezone: businessSettings?.timezone ?? "Europe/London",
  };
}

/**
 * Load appointment details for the confirmation/management page.
 * Hashes the raw token for lookup — never stores or returns the raw token.
 */
export async function getConfirmationData(rawToken: string) {
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
          startAt: true,
          endAt: true,
          holdExpiresAt: true,
          durationMins: true,
          serviceName: true,
          pricePence: true,
          depositPence: true,
          timezone: true,
          notes: true,
          customer: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          payments: {
            select: {
              id: true,
              status: true,
              paymentType: true,
              amountPence: true,
              paidAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!tokenRecord) return null;
  if (tokenRecord.revoked) return null;
  if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) return null;

  return tokenRecord.appointment;
}

// ── Booking creation ──────────────────────────────────────────────────────────

class BookingTransactionError extends Error {
  constructor(
    message: string,
    readonly kind: "slot_unavailable" | "policy_changed" | "validation",
  ) {
    super(message);
  }
}

export async function createBooking(input: unknown): Promise<BookingResult> {
  // Rate limit by IP — prevents spam submissions
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "unknown";
  const rateCheck = checkRateLimit(`booking:${ip}`);
  if (!rateCheck.allowed) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  // 1. Parse and validate input structure
  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid booking data",
    };
  }
  const req = parsed.data;
  const email = req.customer.email.toLowerCase().trim();

  // 2. Load service from DB — never trust client price, duration, or deposit
  const service = await db.service.findUnique({
    where: { slug: req.serviceSlug, active: true },
    select: {
      id: true,
      name: true,
      durationMins: true,
      bufferMins: true,
      pricePence: true,
      depositType: true,
      depositPence: true,
      depositPercentage: true,
      questions: {
        orderBy: { displayOrder: "asc" },
        include: {
          options: { orderBy: { displayOrder: "asc" } },
        },
      },
    },
  });
  if (!service) {
    return { success: false, error: "Service not found or is no longer available" };
  }

  // 3. Validate question answers server-side
  const answerError = validateAnswers(service.questions, req.answers);
  if (answerError) return { success: false, error: answerError };

  // 4. Load all currently published policies
  const publishedPolicies = await db.policy.findMany({
    where: { published: true },
    select: { type: true, title: true, content: true, version: true },
  });

  // Every published policy must be explicitly accepted
  const acceptedTypes = new Set(req.policies.map((p) => p.policyType));
  for (const policy of publishedPolicies) {
    if (!acceptedTypes.has(policy.type as string)) {
      return {
        success: false,
        error: `You must accept the ${policy.title} to continue`,
      };
    }
  }

  // 5. Load settings
  const [businessSettings, bookingSettings] = await Promise.all([
    db.businessSettings.findFirst({ select: { timezone: true } }),
    db.bookingSettings.findFirst({
      select: { minNoticeHours: true, maxAdvanceDays: true, paymentHoldMins: true },
    }),
  ]);

  const timezone = businessSettings?.timezone ?? "Europe/London";
  const minNoticeHours = bookingSettings?.minNoticeHours ?? 24;
  const maxAdvanceDays = bookingSettings?.maxAdvanceDays ?? 90;
  const paymentHoldMins = bookingSettings?.paymentHoldMins ?? 15;

  // 6. Validate date is within the booking window
  const now = new Date();
  const fromDate = new Date(now.getTime() + minNoticeHours * 3_600_000);
  const toDate = new Date(now.getTime() + maxAdvanceDays * 86_400_000);
  const fromDateStr = utcToDateStr(fromDate, timezone);
  const toDateStr = utcToDateStr(toDate, timezone);

  if (req.dateStr < fromDateStr || req.dateStr > toDateStr) {
    return {
      success: false,
      error:
        "The selected date is outside the available booking window. Please go back and choose another date.",
    };
  }

  // 7. Load availability data for pre-check (optimistic, before lock)
  const [rules, blockedPeriods, existingAppointments] = await Promise.all([
    db.availabilityRule.findMany({ where: { active: true } }),
    db.blockedPeriod.findMany({
      select: { startAt: true, endAt: true, allDay: true, recurrence: true, recurrenceEndDate: true },
    }),
    db.appointment.findMany({
      where: {
        startAt: { lte: toDate },
        endAt: { gte: fromDate },
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
      },
      select: { startAt: true, endAt: true, bufferMins: true, status: true, holdExpiresAt: true },
    }),
  ]);

  const availabilitySettings = { minNoticeHours, maxAdvanceDays, timezone };
  const serviceInput = {
    durationMins: service.durationMins,
    bufferMins: service.bufferMins,
  };

  const toMappedRules = (rs: typeof rules) =>
    rs.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      active: r.active,
    }));
  const toMappedBlocked = (bps: typeof blockedPeriods, from: Date, to: Date) =>
    expandBlockedPeriods(bps, from, to);
  const toMappedAppts = (appts: typeof existingAppointments) =>
    appts.map((a) => ({
      startAt: a.startAt,
      endAt: a.endAt,
      bufferMins: a.bufferMins,
      status: a.status,
      holdExpiresAt: a.holdExpiresAt,
    }));

  // 8. Pre-check availability before acquiring the lock
  const preCheckOk = isSlotAvailable({
    dateStr: req.dateStr,
    timeStr: req.timeStr,
    service: serviceInput,
    rules: toMappedRules(rules),
    blockedPeriods: toMappedBlocked(blockedPeriods, fromDate, toDate),
    appointments: toMappedAppts(existingAppointments),
    settings: availabilitySettings,
    now,
  });
  if (!preCheckOk) {
    return {
      success: false,
      error:
        "The selected time is no longer available. Please go back and choose another time.",
    };
  }

  // 9. Calculate appointment times and deposit
  const startAt = wallClockToUtc(req.dateStr, req.timeStr, timezone);
  const endAt = new Date(startAt.getTime() + service.durationMins * 60_000);
  const holdExpiresAt = new Date(now.getTime() + paymentHoldMins * 60_000);
  const depositPence = calculateDepositPence({
    pricePence: service.pricePence,
    depositType: service.depositType as string,
    depositPence: service.depositPence,
    depositPercentage: service.depositPercentage,
  });

  // 10. Generate token — raw value returned to customer once, hash stored in DB
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  // 11. Acquire per-day advisory lock, re-check, and create all records atomically
  const lockKey = makeLockKey(req.dateStr);

  try {
    await db.$transaction(async (tx) => {
      // Serialise concurrent same-day booking attempts with a transaction-scoped lock
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BigInt(lockKey)})`;

      // Re-check availability INSIDE the transaction with fresh data
      const nowInTx = new Date();
      const [rulesInTx, blockedInTx, apptsInTx] = await Promise.all([
        tx.availabilityRule.findMany({ where: { active: true } }),
        tx.blockedPeriod.findMany({
          select: { startAt: true, endAt: true, allDay: true, recurrence: true, recurrenceEndDate: true },
        }),
        tx.appointment.findMany({
          where: {
            startAt: { lte: toDate },
            endAt: { gte: fromDate },
            status: { notIn: ["CANCELLED", "RESCHEDULED"] },
          },
          select: {
            startAt: true,
            endAt: true,
            bufferMins: true,
            status: true,
            holdExpiresAt: true,
          },
        }),
      ]);

      if (
        !isSlotAvailable({
          dateStr: req.dateStr,
          timeStr: req.timeStr,
          service: serviceInput,
          rules: toMappedRules(rulesInTx),
          blockedPeriods: toMappedBlocked(blockedInTx, fromDate, toDate),
          appointments: toMappedAppts(apptsInTx),
          settings: availabilitySettings,
          now: nowInTx,
        })
      ) {
        throw new BookingTransactionError(
          "The selected time is no longer available. Please go back and choose another time.",
          "slot_unavailable",
        );
      }

      // Re-verify published policies inside transaction (snapshot integrity)
      const policiesInTx = await tx.policy.findMany({
        where: { published: true },
        select: { type: true, title: true, content: true, version: true },
      });

      for (const policy of policiesInTx) {
        if (!acceptedTypes.has(policy.type as string)) {
          throw new BookingTransactionError(
            "Policy requirements have been updated. Please review and accept the updated policies.",
            "policy_changed",
          );
        }
      }

      // Reuse existing customer by email (case-insensitive via pre-normalised email)
      let customer = await tx.customer.findFirst({
        where: { email },
        orderBy: { createdAt: "asc" },
      });
      if (!customer) {
        customer = await tx.customer.create({
          data: {
            firstName: req.customer.firstName.trim(),
            lastName: req.customer.lastName.trim(),
            email,
            phone: req.customer.phone.trim() || null,
            notes: null,
          },
        });
      }

      // Create appointment with authoritative service snapshot
      const appointment = await tx.appointment.create({
        data: {
          customerId: customer.id,
          serviceId: service.id,
          status: AppointmentStatus.PENDING,
          startAt,
          endAt,
          holdExpiresAt,
          durationMins: service.durationMins,
          bufferMins: service.bufferMins,
          timezone,
          serviceName: service.name,
          pricePence: service.pricePence,
          depositPence,
          notes: req.customer.notes?.trim() || null,
        },
      });

      // Create appointment answers with question label snapshot
      if (req.answers.length > 0) {
        await tx.appointmentAnswer.createMany({
          data: req.answers.map((a) => ({
            appointmentId: appointment.id,
            questionId: a.questionId,
            questionLabel: a.questionLabel,
            answer: a.answer,
          })),
        });
      }

      // Store only the SHA-256 hash — raw token is never persisted
      await tx.appointmentToken.create({
        data: {
          appointmentId: appointment.id,
          tokenHash,
          expiresAt: null,
          revoked: false,
        },
      });

      // Audit trail
      await tx.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          eventType: AppointmentEventType.CREATED,
          description: "Booking submitted by customer",
          metadata: {
            serviceId: service.id,
            dateStr: req.dateStr,
            timeStr: req.timeStr,
          },
        },
      });

      // Immutable policy acceptance snapshots — content recorded at acceptance time
      for (const policy of policiesInTx) {
        await tx.policyAcceptance.create({
          data: {
            appointmentId: appointment.id,
            policyType: policy.type,
            policyVersion: policy.version,
            policyContent: policy.content,
          },
        });
      }
    });
  } catch (err) {
    if (err instanceof BookingTransactionError) {
      return { success: false, error: err.message };
    }
    console.error("[createBooking] transaction failed:", err);
    return {
      success: false,
      error: "Your booking could not be completed. Please try again.",
    };
  }

  // Fire-and-forget: send booking received email after successful transaction
  setImmediate(async () => {
    try {
      const [appt, business, adminUser] = await Promise.all([
        db.appointment.findFirst({
          where: { tokens: { some: { tokenHash: createHash("sha256").update(rawToken).digest("hex") } } },
          select: {
            id: true,
            serviceName: true,
            startAt: true,
            timezone: true,
            pricePence: true,
            depositPence: true,
            customer: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        }),
        db.businessSettings.findFirst({ select: { businessName: true, resendApiKey: true, emailFrom: true } }),
        db.user.findFirst({ select: { email: true } }),
      ]);
      if (!appt || !business) return;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

      // Customer confirmation email
      void sendNotification({
        appointmentId: appt.id,
        type: "BOOKING_CONFIRMATION",
        recipientEmail: appt.customer.email,
        deduplicationKey: `BOOKING_CONFIRMATION:${appt.id}`,
        data: {
          customerFirstName: appt.customer.firstName,
          customerEmail: appt.customer.email,
          serviceName: appt.serviceName,
          startAt: appt.startAt,
          timezone: appt.timezone,
          pricePence: appt.pricePence,
          depositPence: appt.depositPence,
          businessName: business.businessName,
          manageUrl: `${appUrl}/manage-booking/${rawToken}`,
        },
      });

      // Admin new-booking notification
      const adminEmail = adminUser?.email;
      const apiKey = business.resendApiKey || process.env.RESEND_API_KEY;
      const fromEmail = business.emailFrom || process.env.EMAIL_FROM;
      if (adminEmail && apiKey && fromEmail) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(apiKey);
          const bookedAt = new Intl.DateTimeFormat("en-GB", {
            dateStyle: "full", timeStyle: "short", timeZone: appt.timezone,
          }).format(new Date(appt.startAt));
          const customerName = `${appt.customer.firstName} ${appt.customer.lastName ?? ""}`.trim();
          await resend.emails.send({
            from: fromEmail,
            to: adminEmail,
            subject: `New booking: ${appt.serviceName} — ${customerName}`,
            html: `
              <p>You have a new booking.</p>
              <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
                <tr><td style="padding:4px 12px 4px 0;color:#666">Service</td><td><strong>${appt.serviceName}</strong></td></tr>
                <tr><td style="padding:4px 12px 4px 0;color:#666">Date &amp; time</td><td><strong>${bookedAt}</strong></td></tr>
                <tr><td style="padding:4px 12px 4px 0;color:#666">Customer</td><td>${customerName}</td></tr>
                <tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td><a href="mailto:${appt.customer.email}">${appt.customer.email}</a></td></tr>
                ${appt.customer.phone ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Phone</td><td>${appt.customer.phone}</td></tr>` : ""}
              </table>
              <p style="margin-top:16px"><a href="${appUrl}/admin/appointments" style="background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px">View in admin</a></p>
            `,
          });
        } catch (err) {
          console.error("[createBooking] admin notification email failed:", err);
        }
      }
    } catch (err) {
      console.error("[createBooking] booking confirmation email failed:", err);
    }
  });

  return { success: true, token: rawToken };
}

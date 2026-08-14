"use server";

import { headers } from "next/headers";
import { createHash } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendNotification } from "@/lib/email";
import { isSlotAvailable, wallClockToUtc } from "@/lib/availability";
import {
  AppointmentStatus,
  AppointmentEventType,
} from "@/lib/generated/prisma/client";

type FailResult = { success: false; error: string };

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function resolveToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const record = await db.appointmentToken.findUnique({
    where: { tokenHash },
    select: {
      revoked: true,
      expiresAt: true,
      lastUsedAt: true,
      id: true,
      appointment: {
        select: {
          id: true,
          status: true,
          startAt: true,
          endAt: true,
          durationMins: true,
          bufferMins: true,
          timezone: true,
          serviceName: true,
          pricePence: true,
          depositPence: true,
          notes: true,
          customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          payments: { select: { status: true, amountPence: true, paymentType: true } },
          service: { select: { slug: true } },
        },
      },
    },
  });

  if (!record) return null;
  if (record.revoked) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  return record;
}

// ── Get appointment data for manage-booking page ──────────────────────────────

export async function getManageBookingData(rawToken: string) {
  const record = await resolveToken(rawToken);
  if (!record) return null;

  const settings = await db.bookingSettings.findFirst({
    select: {
      customerCanCancel: true,
      customerCanReschedule: true,
      cancellationDeadlineHours: true,
      reschedulingDeadlineHours: true,
    },
  });

  const now = new Date();
  const hoursUntilAppt =
    (record.appointment.startAt.getTime() - now.getTime()) / 3_600_000;

  const canCancel =
    (settings?.customerCanCancel ?? true) &&
    ["PENDING", "CONFIRMED"].includes(record.appointment.status) &&
    hoursUntilAppt > (settings?.cancellationDeadlineHours ?? 24);

  const canReschedule =
    (settings?.customerCanReschedule ?? true) &&
    ["CONFIRMED"].includes(record.appointment.status) &&
    hoursUntilAppt > (settings?.reschedulingDeadlineHours ?? 24);

  await db.appointmentToken.update({
    where: { id: record.id },
    data: { lastUsedAt: now },
  });

  return {
    appointment: record.appointment,
    canCancel,
    canReschedule,
    cancellationDeadlineHours: settings?.cancellationDeadlineHours ?? 24,
    reschedulingDeadlineHours: settings?.reschedulingDeadlineHours ?? 24,
  };
}

// ── Customer cancel via token ─────────────────────────────────────────────────

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function cancelByToken(
  rawToken: string,
  reason?: string,
): Promise<{ success: true } | FailResult> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "unknown";
  if (!checkRateLimit(`manage:${ip}`).allowed) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  const parsed = cancelSchema.safeParse({ reason });
  if (!parsed.success) return { success: false, error: "Invalid input" };

  const record = await resolveToken(rawToken);
  if (!record) return { success: false, error: "Invalid or expired link" };

  const { appointment } = record;

  if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
    return { success: false, error: "This appointment cannot be cancelled" };
  }

  const settings = await db.bookingSettings.findFirst({
    select: { customerCanCancel: true, cancellationDeadlineHours: true },
  });

  if (!settings?.customerCanCancel) {
    return { success: false, error: "Online cancellation is not available. Please contact us directly." };
  }

  const hoursUntilAppt = (appointment.startAt.getTime() - Date.now()) / 3_600_000;
  if (hoursUntilAppt <= (settings.cancellationDeadlineHours ?? 24)) {
    return {
      success: false,
      error: `Appointments cannot be cancelled within ${settings.cancellationDeadlineHours} hours of the start time.`,
    };
  }

  await db.appointment.update({
    where: { id: appointment.id },
    data: {
      status: AppointmentStatus.CANCELLED,
      events: {
        create: {
          eventType: AppointmentEventType.CANCELLED,
          description: parsed.data.reason
            ? `Cancelled by customer: ${parsed.data.reason}`
            : "Cancelled by customer via self-service link",
          ...(parsed.data.reason ? { metadata: { reason: parsed.data.reason } } : {}),
        },
      },
    },
  });

  const business = await db.businessSettings.findFirst({ select: { businessName: true } });
  if (business) {
    void sendNotification({
      appointmentId: appointment.id,
      type: "CANCELLATION_CONFIRMATION",
      recipientEmail: appointment.customer.email,
      deduplicationKey: `CANCELLATION_CONFIRMATION:${appointment.id}`,
      data: {
        customerFirstName: appointment.customer.firstName,
        customerEmail: appointment.customer.email,
        serviceName: appointment.serviceName,
        startAt: appointment.startAt,
        timezone: appointment.timezone,
        pricePence: appointment.pricePence,
        depositPence: appointment.depositPence,
        businessName: business.businessName,
        cancellationReason: parsed.data.reason,
      },
    });
  }

  return { success: true };
}

// ── Customer reschedule via token ─────────────────────────────────────────────

const rescheduleSchema = z.object({
  newDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  newTimeStr: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
});

export async function rescheduleByToken(
  rawToken: string,
  newDateStr: string,
  newTimeStr: string,
): Promise<{ success: true } | FailResult> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "unknown";
  if (!checkRateLimit(`manage:${ip}`).allowed) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  const parsed = rescheduleSchema.safeParse({ newDateStr, newTimeStr });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const record = await resolveToken(rawToken);
  if (!record) return { success: false, error: "Invalid or expired link" };

  const { appointment } = record;

  if (appointment.status !== "CONFIRMED") {
    return { success: false, error: "Only confirmed appointments can be rescheduled" };
  }

  const [settings, businessSettings] = await Promise.all([
    db.bookingSettings.findFirst({
      select: {
        customerCanReschedule: true,
        reschedulingDeadlineHours: true,
        minNoticeHours: true,
        maxAdvanceDays: true,
      },
    }),
    db.businessSettings.findFirst({ select: { timezone: true, businessName: true } }),
  ]);

  if (!settings?.customerCanReschedule) {
    return { success: false, error: "Online rescheduling is not available. Please contact us directly." };
  }

  const hoursUntilAppt = (appointment.startAt.getTime() - Date.now()) / 3_600_000;
  if (hoursUntilAppt <= (settings.reschedulingDeadlineHours ?? 24)) {
    return {
      success: false,
      error: `Appointments cannot be rescheduled within ${settings.reschedulingDeadlineHours} hours of the start time.`,
    };
  }

  const timezone = businessSettings?.timezone ?? "Europe/London";

  const [rules, blockedPeriods, existingAppointments] = await Promise.all([
    db.availabilityRule.findMany({ where: { active: true } }),
    db.blockedPeriod.findMany(),
    db.appointment.findMany({
      where: {
        id: { not: appointment.id },
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
      },
      select: { startAt: true, endAt: true, bufferMins: true, status: true, holdExpiresAt: true },
    }),
  ]);

  const slotAvailable = isSlotAvailable({
    dateStr: parsed.data.newDateStr,
    timeStr: parsed.data.newTimeStr,
    service: { durationMins: appointment.durationMins, bufferMins: appointment.bufferMins },
    rules: rules.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime, active: r.active })),
    blockedPeriods: blockedPeriods.map((bp) => ({ startAt: bp.startAt, endAt: bp.endAt, allDay: bp.allDay })),
    appointments: existingAppointments.map((a) => ({
      startAt: a.startAt,
      endAt: a.endAt,
      bufferMins: a.bufferMins,
      status: a.status,
      holdExpiresAt: a.holdExpiresAt,
    })),
    settings: {
      minNoticeHours: settings.minNoticeHours ?? 24,
      maxAdvanceDays: settings.maxAdvanceDays ?? 90,
      timezone,
    },
    now: new Date(),
  });

  if (!slotAvailable) {
    return { success: false, error: "The selected time is not available. Please choose another slot." };
  }

  const newStartAt = wallClockToUtc(parsed.data.newDateStr, parsed.data.newTimeStr, timezone);
  const newEndAt = new Date(newStartAt.getTime() + appointment.durationMins * 60_000);

  await db.appointment.update({
    where: { id: appointment.id },
    data: {
      startAt: newStartAt,
      endAt: newEndAt,
      events: {
        create: {
          eventType: AppointmentEventType.RESCHEDULED,
          description: `Rescheduled by customer to ${parsed.data.newDateStr} at ${parsed.data.newTimeStr}`,
          metadata: {
            previousStartAt: appointment.startAt.toISOString(),
            newStartAt: newStartAt.toISOString(),
          },
        },
      },
    },
  });

  if (businessSettings) {
    void sendNotification({
      appointmentId: appointment.id,
      type: "RESCHEDULE_CONFIRMATION",
      recipientEmail: appointment.customer.email,
      deduplicationKey: `RESCHEDULE_CONFIRMATION:${appointment.id}:${newStartAt.getTime()}`,
      data: {
        customerFirstName: appointment.customer.firstName,
        customerEmail: appointment.customer.email,
        serviceName: appointment.serviceName,
        startAt: newStartAt,
        timezone,
        pricePence: appointment.pricePence,
        depositPence: appointment.depositPence,
        businessName: businessSettings.businessName,
      },
    });
  }

  return { success: true };
}

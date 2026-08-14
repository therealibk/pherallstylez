"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/email";
import {
  isSlotAvailable,
  wallClockToUtc,
} from "@/lib/availability";
import {
  AppointmentStatus,
  AppointmentEventType,
} from "@/lib/generated/prisma/client";

// ── Auth guard ────────────────────────────────────────────────────────────────

type FailResult = { success: false; error: string };

async function requireAdmin(): Promise<true | FailResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };
  return true;
}

// ── Valid status transitions ──────────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
};

function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── List appointments ─────────────────────────────────────────────────────────

export type AppointmentListFilter = {
  status?: AppointmentStatus | "ALL";
  dateStr?: string;
  search?: string;
  page?: number;
};

export type AppointmentListItem = {
  id: string;
  status: AppointmentStatus;
  startAt: Date;
  endAt: Date;
  serviceName: string;
  pricePence: number;
  depositPence: number;
  customer: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  payments: { status: string; amountPence: number; paymentType: string }[];
};

export async function listAppointments(filter: AppointmentListFilter = {}): Promise<{
  appointments: AppointmentListItem[];
  total: number;
  page: number;
  pages: number;
}> {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  // Build where clause
  type WhereInput = {
    status?: AppointmentStatus;
    startAt?: { gte: Date; lt: Date };
    OR?: Array<{
      customer?: { OR?: Array<{ firstName?: { contains: string; mode: "insensitive" }; lastName?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" } }> };
      serviceName?: { contains: string; mode: "insensitive" };
    }>;
  };

  const where: WhereInput = {};

  if (filter.status && filter.status !== "ALL") {
    where.status = filter.status;
  }

  if (filter.dateStr) {
    const date = new Date(filter.dateStr);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    where.startAt = { gte: date, lt: next };
  }

  if (filter.search?.trim()) {
    const s = filter.search.trim();
    where.OR = [
      { customer: { OR: [{ firstName: { contains: s, mode: "insensitive" } }, { lastName: { contains: s, mode: "insensitive" } }, { email: { contains: s, mode: "insensitive" } }] } },
      { serviceName: { contains: s, mode: "insensitive" } },
    ];
  }

  const [appointments, total] = await Promise.all([
    db.appointment.findMany({
      where,
      orderBy: { startAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        serviceName: true,
        pricePence: true,
        depositPence: true,
        customer: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        payments: { select: { status: true, amountPence: true, paymentType: true } },
      },
    }),
    db.appointment.count({ where }),
  ]);

  return {
    appointments,
    total,
    page,
    pages: Math.ceil(total / pageSize),
  };
}

// ── Get appointment detail ────────────────────────────────────────────────────

export async function getAppointmentDetail(id: string) {
  return db.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      startAt: true,
      endAt: true,
      serviceName: true,
      pricePence: true,
      depositPence: true,
      durationMins: true,
      bufferMins: true,
      timezone: true,
      notes: true,
      adminNotes: true,
      createdAt: true,
      updatedAt: true,
      customer: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, notes: true },
      },
      service: { select: { id: true, slug: true, name: true } },
      answers: {
        select: { questionLabel: true, answer: true },
        orderBy: { id: "asc" },
      },
      events: {
        select: { id: true, eventType: true, description: true, metadata: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      payments: {
        select: {
          id: true,
          status: true,
          paymentType: true,
          amountPence: true,
          currency: true,
          paidAt: true,
          failureReason: true,
          refunds: { select: { id: true, amountPence: true, status: true, processedAt: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

// ── Confirm appointment ───────────────────────────────────────────────────────

export async function confirmAppointment(
  id: string,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const appt = await db.appointment.findUnique({
    where: { id },
    select: { status: true, serviceName: true, startAt: true, endAt: true, depositPence: true, pricePence: true, timezone: true, customer: { select: { firstName: true, email: true } } },
  });
  if (!appt) return { success: false, error: "Appointment not found" };
  if (!canTransition(appt.status, AppointmentStatus.CONFIRMED)) {
    return { success: false, error: `Cannot confirm a ${appt.status.toLowerCase()} appointment` };
  }

  await db.appointment.update({
    where: { id },
    data: {
      status: AppointmentStatus.CONFIRMED,
      events: { create: { eventType: AppointmentEventType.CONFIRMED, description: "Appointment confirmed by admin" } },
    },
  });

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${id}`);
  revalidatePath("/admin/dashboard");

  const [business] = await Promise.all([db.businessSettings.findFirst({ select: { businessName: true } })]);
  if (business) {
    void sendNotification({
      appointmentId: id,
      type: "BOOKING_CONFIRMATION",
      recipientEmail: appt.customer.email,
      deduplicationKey: `BOOKING_CONFIRMATION:${id}`,
      data: {
        customerFirstName: appt.customer.firstName,
        customerEmail: appt.customer.email,
        serviceName: appt.serviceName,
        startAt: appt.startAt,
        timezone: appt.timezone,
        pricePence: appt.pricePence,
        depositPence: appt.depositPence,
        businessName: business.businessName,
      },
    });
  }

  return { success: true };
}

// ── Cancel appointment ────────────────────────────────────────────────────────

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function cancelAppointment(
  id: string,
  reason?: string,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = cancelSchema.safeParse({ reason });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const appt = await db.appointment.findUnique({
    where: { id },
    select: { status: true, serviceName: true, startAt: true, endAt: true, depositPence: true, pricePence: true, timezone: true, customer: { select: { firstName: true, email: true } } },
  });
  if (!appt) return { success: false, error: "Appointment not found" };
  if (!canTransition(appt.status, AppointmentStatus.CANCELLED)) {
    return { success: false, error: `Cannot cancel a ${appt.status.toLowerCase()} appointment` };
  }

  await db.appointment.update({
    where: { id },
    data: {
      status: AppointmentStatus.CANCELLED,
      events: {
        create: {
          eventType: AppointmentEventType.CANCELLED,
          description: parsed.data.reason ? `Cancelled by admin: ${parsed.data.reason}` : "Cancelled by admin",
          ...(parsed.data.reason ? { metadata: { reason: parsed.data.reason } } : {}),
        },
      },
    },
  });

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${id}`);
  revalidatePath("/admin/dashboard");

  const business = await db.businessSettings.findFirst({ select: { businessName: true } });
  if (business) {
    void sendNotification({
      appointmentId: id,
      type: "CANCELLATION_CONFIRMATION",
      recipientEmail: appt.customer.email,
      deduplicationKey: `CANCELLATION_CONFIRMATION:${id}`,
      data: {
        customerFirstName: appt.customer.firstName,
        customerEmail: appt.customer.email,
        serviceName: appt.serviceName,
        startAt: appt.startAt,
        timezone: appt.timezone,
        pricePence: appt.pricePence,
        depositPence: appt.depositPence,
        businessName: business.businessName,
        cancellationReason: parsed.data.reason,
      },
    });
  }

  return { success: true };
}

// ── Complete appointment ──────────────────────────────────────────────────────

export async function completeAppointment(
  id: string,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const appt = await db.appointment.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!appt) return { success: false, error: "Appointment not found" };
  if (!canTransition(appt.status, AppointmentStatus.COMPLETED)) {
    return { success: false, error: `Cannot complete a ${appt.status.toLowerCase()} appointment` };
  }

  await db.appointment.update({
    where: { id },
    data: {
      status: AppointmentStatus.COMPLETED,
      events: { create: { eventType: AppointmentEventType.COMPLETED, description: "Appointment marked as completed" } },
    },
  });

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${id}`);
  revalidatePath("/admin/dashboard");
  return { success: true };
}

// ── Mark no-show ──────────────────────────────────────────────────────────────

export async function markNoShow(
  id: string,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const appt = await db.appointment.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!appt) return { success: false, error: "Appointment not found" };
  if (!canTransition(appt.status, AppointmentStatus.NO_SHOW)) {
    return { success: false, error: `Cannot mark a ${appt.status.toLowerCase()} appointment as no-show` };
  }

  await db.appointment.update({
    where: { id },
    data: {
      status: AppointmentStatus.NO_SHOW,
      events: { create: { eventType: AppointmentEventType.NO_SHOW, description: "Marked as no-show by admin" } },
    },
  });

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${id}`);
  revalidatePath("/admin/dashboard");
  return { success: true };
}

// ── Add internal note ─────────────────────────────────────────────────────────

const noteSchema = z.object({
  note: z.string().min(1).max(2000),
});

export async function addAppointmentNote(
  id: string,
  note: string,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = noteSchema.safeParse({ note });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const appt = await db.appointment.findUnique({ where: { id }, select: { id: true } });
  if (!appt) return { success: false, error: "Appointment not found" };

  await db.appointment.update({
    where: { id },
    data: {
      adminNotes: parsed.data.note,
      events: {
        create: {
          eventType: AppointmentEventType.NOTE_ADDED,
          description: parsed.data.note,
        },
      },
    },
  });

  revalidatePath(`/admin/appointments/${id}`);
  return { success: true };
}

// ── Reschedule appointment (admin) ────────────────────────────────────────────

const rescheduleSchema = z.object({
  newDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  newTimeStr: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
});

export async function rescheduleAppointment(
  id: string,
  newDateStr: string,
  newTimeStr: string,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = rescheduleSchema.safeParse({ newDateStr, newTimeStr });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const appt = await db.appointment.findUnique({
    where: { id },
    select: {
      status: true,
      durationMins: true,
      bufferMins: true,
      timezone: true,
      startAt: true,
      endAt: true,
      serviceName: true,
      pricePence: true,
      depositPence: true,
      customer: { select: { firstName: true, email: true } },
    },
  });
  if (!appt) return { success: false, error: "Appointment not found" };

  const rescheduleableStatuses: AppointmentStatus[] = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
  if (!rescheduleableStatuses.includes(appt.status)) {
    return { success: false, error: `Cannot reschedule a ${appt.status.toLowerCase()} appointment` };
  }

  const [rules, blockedPeriods, existingAppointments, businessSettings, bookingSettings] = await Promise.all([
    db.availabilityRule.findMany({ where: { active: true } }),
    db.blockedPeriod.findMany(),
    db.appointment.findMany({
      where: {
        id: { not: id },
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
      },
      select: { startAt: true, endAt: true, bufferMins: true, status: true, holdExpiresAt: true },
    }),
    db.businessSettings.findFirst({ select: { timezone: true, businessName: true } }),
    db.bookingSettings.findFirst({ select: { minNoticeHours: true, maxAdvanceDays: true } }),
  ]);

  const timezone = businessSettings?.timezone ?? "Europe/London";
  const minNoticeHours = bookingSettings?.minNoticeHours ?? 0;
  const maxAdvanceDays = bookingSettings?.maxAdvanceDays ?? 365;

  const slotAvailable = isSlotAvailable({
    dateStr: parsed.data.newDateStr,
    timeStr: parsed.data.newTimeStr,
    service: { durationMins: appt.durationMins, bufferMins: appt.bufferMins },
    rules: rules.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.startTime, endTime: r.endTime, active: r.active })),
    blockedPeriods: blockedPeriods.map((bp) => ({ startAt: bp.startAt, endAt: bp.endAt, allDay: bp.allDay })),
    appointments: existingAppointments.map((a) => ({
      startAt: a.startAt,
      endAt: a.endAt,
      bufferMins: a.bufferMins,
      status: a.status,
      holdExpiresAt: a.holdExpiresAt,
    })),
    settings: { minNoticeHours, maxAdvanceDays, timezone },
    now: new Date(),
  });

  if (!slotAvailable) {
    return { success: false, error: "The selected time is not available. Please choose another slot." };
  }

  const newStartAt = wallClockToUtc(parsed.data.newDateStr, parsed.data.newTimeStr, timezone);
  const newEndAt = new Date(newStartAt.getTime() + appt.durationMins * 60_000);

  await db.appointment.update({
    where: { id },
    data: {
      startAt: newStartAt,
      endAt: newEndAt,
      events: {
        create: {
          eventType: AppointmentEventType.RESCHEDULED,
          description: `Rescheduled by admin to ${parsed.data.newDateStr} at ${parsed.data.newTimeStr}`,
          metadata: {
            previousStartAt: appt.startAt.toISOString(),
            newStartAt: newStartAt.toISOString(),
          },
        },
      },
    },
  });

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${id}`);
  revalidatePath("/admin/calendar");

  if (businessSettings) {
    void sendNotification({
      appointmentId: id,
      type: "RESCHEDULE_CONFIRMATION",
      recipientEmail: appt.customer.email,
      deduplicationKey: `RESCHEDULE_CONFIRMATION:${id}:${newStartAt.getTime()}`,
      data: {
        customerFirstName: appt.customer.firstName,
        customerEmail: appt.customer.email,
        serviceName: appt.serviceName,
        startAt: newStartAt,
        timezone,
        pricePence: appt.pricePence,
        depositPence: appt.depositPence,
        businessName: businessSettings.businessName,
      },
    });
  }

  return { success: true };
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const sevenDaysEnd = new Date(now.getTime() + 7 * 86_400_000);

  // Monthly revenue window: 1st of this month → now
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayCount,
    upcomingCount,
    todayAppointments,
    upcomingAppointments,
    monthlyPayments,
    confirmedAppointments,
  ] = await Promise.all([
    db.appointment.count({
      where: {
        startAt: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
    }),
    db.appointment.count({
      where: {
        startAt: { gt: now, lte: sevenDaysEnd },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
    }),
    db.appointment.findMany({
      where: {
        startAt: { gte: todayStart, lte: todayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
      },
      orderBy: { startAt: "asc" },
      take: 5,
      select: {
        id: true,
        status: true,
        startAt: true,
        serviceName: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    db.appointment.findMany({
      where: {
        startAt: { gt: now, lte: sevenDaysEnd },
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      orderBy: { startAt: "asc" },
      take: 5,
      select: {
        id: true,
        status: true,
        startAt: true,
        serviceName: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    // Payments received this calendar month (gross, pre-refund)
    db.payment.findMany({
      where: {
        status: { in: ["PAID_IN_FULL", "DEPOSIT_PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
        paidAt: { gte: monthStart, lte: now },
      },
      select: {
        amountPence: true,
        refunds: { select: { amountPence: true, status: true } },
      },
    }),
    // Confirmed appointments that still have an outstanding balance
    db.appointment.findMany({
      where: { status: "CONFIRMED" },
      select: {
        pricePence: true,
        depositPence: true,
        payments: {
          select: { status: true, amountPence: true },
        },
      },
    }),
  ]);

  // Net monthly revenue = paid amounts minus refunds
  const monthlyRevenuePence = monthlyPayments.reduce((sum, p) => {
    const refunded = p.refunds
      .filter((r) => r.status === "SUCCEEDED")
      .reduce((s, r) => s + r.amountPence, 0);
    return sum + p.amountPence - refunded;
  }, 0);

  // Outstanding balance = sum of deposit_paid balances on confirmed appointments
  const outstandingPence = confirmedAppointments.reduce((sum, appt) => {
    const depositPaid = appt.payments.some((p) => p.status === "DEPOSIT_PAID");
    const fullPaid = appt.payments.some(
      (p) => p.status === "PAID_IN_FULL" || p.status === "PARTIALLY_REFUNDED" || p.status === "REFUNDED",
    );
    if (depositPaid && !fullPaid && appt.depositPence > 0) {
      return sum + (appt.pricePence - appt.depositPence);
    }
    return sum;
  }, 0);

  return {
    todayCount,
    upcomingCount,
    todayAppointments,
    upcomingAppointments,
    monthlyRevenuePence,
    outstandingPence,
  };
}

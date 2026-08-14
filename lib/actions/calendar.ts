"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { AppointmentStatus, PaymentStatus } from "@/lib/generated/prisma/client";

type Guard = { ok: false } | { ok: true };

async function guard(): Promise<Guard> {
  const session = await auth();
  return session ? { ok: true } : { ok: false };
}

// ── Types shared with client components ───────────────────────────────────────

export type CalendarAppt = {
  id: string;
  status: AppointmentStatus;
  startAt: string;       // ISO — serialised for client
  endAt: string;         // ISO
  durationMins: number;
  bufferMins: number;
  serviceName: string;
  pricePence: number;
  depositPence: number;
  adminNotes: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  latestPaymentStatus: PaymentStatus | null;
};

export type DrawerAppt = CalendarAppt & {
  notes: string | null;
  serviceId: string | null;
  timezone: string;
  startAtDate: string;   // "YYYY-MM-DD" in business tz — for reschedule form
  startAtTime: string;   // "HH:MM"     in business tz — for reschedule form
  events: Array<{
    id: string;
    eventType: string;
    description: string | null;
    createdAt: string;
  }>;
};

// ── Fetch appointments for a date range ───────────────────────────────────────

export async function fetchCalendarRange(
  startIso: string,
  endIso: string,
  statusFilter?: string,
  serviceFilter?: string,
): Promise<CalendarAppt[]> {
  const g = await guard();
  if (!g.ok) return [];

  const start = new Date(startIso);
  const end = new Date(endIso);

  const where: {
    startAt?: { gte: Date; lt: Date };
    status?: AppointmentStatus | { notIn: AppointmentStatus[] };
    serviceName?: { contains: string; mode: "insensitive" };
  } = {
    startAt: { gte: start, lt: end },
  };

  if (statusFilter && statusFilter !== "ALL") {
    where.status = statusFilter as AppointmentStatus;
  }

  if (serviceFilter) {
    where.serviceName = { contains: serviceFilter, mode: "insensitive" };
  }

  const appts = await db.appointment.findMany({
    where,
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      status: true,
      startAt: true,
      endAt: true,
      durationMins: true,
      bufferMins: true,
      serviceName: true,
      pricePence: true,
      depositPence: true,
      adminNotes: true,
      customer: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
      payments: {
        select: { status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return appts.map((a) => ({
    id: a.id,
    status: a.status,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    durationMins: a.durationMins,
    bufferMins: a.bufferMins,
    serviceName: a.serviceName,
    pricePence: a.pricePence,
    depositPence: a.depositPence,
    adminNotes: a.adminNotes,
    customer: a.customer,
    latestPaymentStatus: (a.payments[0]?.status ?? null) as PaymentStatus | null,
  }));
}

// ── Fetch single appointment detail for the drawer ────────────────────────────

export async function fetchDrawerAppointment(id: string): Promise<DrawerAppt | null> {
  const g = await guard();
  if (!g.ok) return null;

  const settings = await db.businessSettings.findFirst({ select: { timezone: true } });
  const timezone = settings?.timezone ?? "Europe/London";

  const a = await db.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      startAt: true,
      endAt: true,
      durationMins: true,
      bufferMins: true,
      serviceName: true,
      serviceId: true,
      timezone: true,
      pricePence: true,
      depositPence: true,
      notes: true,
      adminNotes: true,
      customer: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
      payments: {
        select: { status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      events: {
        select: { id: true, eventType: true, description: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!a) return null;

  // Format startAt in the business timezone for the reschedule form
  const fmt = (type: "date" | "time") =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      ...(type === "date"
        ? { year: "numeric", month: "2-digit", day: "2-digit" }
        : { hour: "2-digit", minute: "2-digit", hour12: false }),
    }).format(a.startAt);

  return {
    id: a.id,
    status: a.status,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    durationMins: a.durationMins,
    bufferMins: a.bufferMins,
    serviceName: a.serviceName,
    serviceId: a.serviceId,
    timezone: a.timezone,
    pricePence: a.pricePence,
    depositPence: a.depositPence,
    notes: a.notes,
    adminNotes: a.adminNotes,
    startAtDate: fmt("date"),
    startAtTime: fmt("time"),
    customer: a.customer,
    latestPaymentStatus: (a.payments[0]?.status ?? null) as PaymentStatus | null,
    events: a.events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

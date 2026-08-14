"use server";

import { db } from "@/lib/db";
import {
  getSlotsForDate,
  getAvailableDatesInRange,
  expandBlockedPeriods,
  utcToDateStr,
} from "@/lib/availability";

/**
 * Load all data needed for availability calculations from the database.
 * Returns null if the service is not found or inactive.
 */
async function loadAvailabilityData(serviceSlug: string) {
  const [service, businessSettings, bookingSettings, rules, now] =
    await Promise.all([
      db.service.findUnique({
        where: { slug: serviceSlug, active: true },
        select: { id: true, durationMins: true, bufferMins: true },
      }),
      db.businessSettings.findFirst({
        select: { timezone: true },
      }),
      db.bookingSettings.findFirst({
        select: { minNoticeHours: true, maxAdvanceDays: true },
      }),
      db.availabilityRule.findMany({ where: { active: true } }),
      Promise.resolve(new Date()),
    ]);

  if (!service) return null;

  const timezone = businessSettings?.timezone ?? "Europe/London";
  const minNoticeHours = bookingSettings?.minNoticeHours ?? 24;
  const maxAdvanceDays = bookingSettings?.maxAdvanceDays ?? 90;

  // Calculate the booking window
  const fromDate = new Date(now.getTime() + minNoticeHours * 3_600_000);
  const toDate = new Date(now.getTime() + maxAdvanceDays * 86_400_000);

  // Load blocked periods that could affect this window (includes recurring)
  const rawBlocked = await db.blockedPeriod.findMany({
    select: { startAt: true, endAt: true, allDay: true, recurrence: true, recurrenceEndDate: true },
  });
  const blockedPeriods = expandBlockedPeriods(rawBlocked, fromDate, toDate);

  // Load active/pending appointments in window (exclude expired holds and cancelled/rescheduled)
  const appointments = await db.appointment.findMany({
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
  });

  return {
    service: { durationMins: service.durationMins, bufferMins: service.bufferMins },
    settings: { minNoticeHours, maxAdvanceDays, timezone },
    rules: rules.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      active: r.active,
    })),
    blockedPeriods: blockedPeriods.map((bp) => ({
      startAt: bp.startAt,
      endAt: bp.endAt,
      allDay: bp.allDay,
    })),
    appointments: appointments.map((a) => ({
      startAt: a.startAt,
      endAt: a.endAt,
      bufferMins: a.bufferMins,
      status: a.status,
      holdExpiresAt: a.holdExpiresAt,
    })),
    fromDateStr: utcToDateStr(fromDate, timezone),
    toDateStr: utcToDateStr(toDate, timezone),
    now,
    timezone,
  };
}

/**
 * Get all available dates in a given month for a service.
 * Returns YYYY-MM-DD strings.
 */
export async function getAvailableDatesForMonth(
  serviceSlug: string,
  year: number,
  month: number, // 1-based
): Promise<string[]> {
  const data = await loadAvailabilityData(serviceSlug);
  if (!data) return [];

  // Clamp the requested month to the booking window
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const fromDateStr = data.fromDateStr > monthStart ? data.fromDateStr : monthStart;
  const toDateStr = data.toDateStr < monthEnd ? data.toDateStr : monthEnd;

  if (fromDateStr > toDateStr) return [];

  return getAvailableDatesInRange({
    fromDateStr,
    toDateStr,
    service: data.service,
    rules: data.rules,
    blockedPeriods: data.blockedPeriods,
    appointments: data.appointments,
    settings: data.settings,
    now: data.now,
  });
}

/**
 * Get available time slots for a specific date and service.
 * Returns HH:MM strings in the business timezone.
 */
export async function getAvailableSlotsForDate(
  serviceSlug: string,
  dateStr: string, // YYYY-MM-DD
): Promise<string[]> {
  const data = await loadAvailabilityData(serviceSlug);
  if (!data) return [];

  // Validate date is within the booking window
  if (dateStr < data.fromDateStr || dateStr > data.toDateStr) return [];

  return getSlotsForDate({
    dateStr,
    service: data.service,
    rules: data.rules,
    blockedPeriods: data.blockedPeriods,
    appointments: data.appointments,
    settings: data.settings,
    now: data.now,
  });
}

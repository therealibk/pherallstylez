/**
 * Pure availability calculation engine.
 * No database access — all data is passed in so the functions are easily testable.
 *
 * Timezone model:
 *  - AvailabilityRule.startTime / endTime are wall-clock HH:MM in the business timezone.
 *  - BlockedPeriod.startAt / endAt are UTC instants (Date objects).
 *  - Appointment.startAt / endAt are UTC instants.
 *  - Appointment.endAt = startAt + durationMins (buffer NOT included in endAt).
 *  - During conflict checks, the effective end of an appointment is endAt + bufferMins.
 *
 * dayOfWeek convention (matches JS Date.getDay()):
 *  0 = Sunday, 1 = Monday, … 6 = Saturday
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AvailabilityRuleInput {
  dayOfWeek: number; // 0–6
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  active: boolean;
}

export interface BlockedPeriodInput {
  startAt: Date;
  endAt: Date;
  allDay: boolean;
}

export interface StoredBlockedPeriod extends BlockedPeriodInput {
  recurrence: string;          // "NONE" | "WEEKLY" | "MONTHLY"
  recurrenceEndDate: Date | null;
}

/**
 * Expand stored blocked periods (which may have recurrence rules) into a flat
 * list of concrete BlockedPeriodInput instances within [fromDate, toDate].
 */
export function expandBlockedPeriods(
  periods: StoredBlockedPeriod[],
  fromDate: Date,
  toDate: Date,
): BlockedPeriodInput[] {
  const results: BlockedPeriodInput[] = [];

  for (const p of periods) {
    const durationMs = p.endAt.getTime() - p.startAt.getTime();
    const cutoff = p.recurrenceEndDate ?? toDate;

    if (p.recurrence === "WEEKLY") {
      let cursor = new Date(p.startAt);
      while (cursor <= cutoff && cursor <= toDate) {
        const occEnd = new Date(cursor.getTime() + durationMs);
        if (occEnd >= fromDate) {
          results.push({ startAt: new Date(cursor), endAt: occEnd, allDay: p.allDay });
        }
        cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    } else if (p.recurrence === "MONTHLY") {
      let cursor = new Date(p.startAt);
      while (cursor <= cutoff && cursor <= toDate) {
        const occEnd = new Date(cursor.getTime() + durationMs);
        if (occEnd >= fromDate) {
          results.push({ startAt: new Date(cursor), endAt: occEnd, allDay: p.allDay });
        }
        const next = new Date(cursor);
        next.setMonth(next.getMonth() + 1);
        cursor = next;
      }
    } else {
      // NONE — one-time block; include if it overlaps the range
      if (p.startAt <= toDate && p.endAt >= fromDate) {
        results.push({ startAt: p.startAt, endAt: p.endAt, allDay: p.allDay });
      }
    }
  }

  return results;
}

export interface AppointmentInput {
  startAt: Date;
  endAt: Date;      // startAt + durationMins (buffer NOT included)
  bufferMins: number;
  status: string;   // AppointmentStatus value
  holdExpiresAt: Date | null;
}

export interface ServiceInput {
  durationMins: number;
  bufferMins: number;
}

export interface AvailabilitySettings {
  minNoticeHours: number;
  maxAdvanceDays: number;
  timezone: string;
}

// ── Timezone helpers ──────────────────────────────────────────────────────────

/**
 * Convert a wall-clock date+time in a named timezone to a UTC Date.
 * Uses a two-pass offset correction that handles DST transitions correctly
 * for the vast majority of real-world cases.
 */
export function wallClockToUtc(
  dateStr: string, // "YYYY-MM-DD"
  timeStr: string, // "HH:MM"
  timezone: string,
): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);

  // First estimate: treat the wall-clock time as UTC (incorrect but a good starting point)
  const estimate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

  // Two-pass: compute offset at the estimate, correct, then re-check
  const corrected = applyTzOffset(estimate, year, month, day, hours, minutes, timezone);
  // Second pass for DST edge cases
  return applyTzOffset(corrected, year, month, day, hours, minutes, timezone);
}

function applyTzOffset(
  ref: Date,
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timezone: string,
): Date {
  // Get what the given timezone reports for this UTC instant
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(ref);

  const get = (type: string): number =>
    parseInt(parts.find((p) => p.type === type)!.value, 10);

  // Construct the "what the timezone says" as a UTC timestamp
  const tzAsUtc = new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") === 24 ? 0 : get("hour"), get("minute"), get("second")),
  );

  // Offset = what UTC we gave - what TZ reads as UTC-equivalent
  const offsetMs = ref.getTime() - tzAsUtc.getTime();

  // The correct UTC time for our wall-clock target = target (in UTC-basis) + offset
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) + offsetMs);
}

/**
 * Return the day of week (0=Sun … 6=Sat) for a YYYY-MM-DD date
 * as seen in the given timezone.
 */
export function getDayOfWeek(dateStr: string, timezone: string): number {
  // Use noon UTC as a reference — safe for all timezones within ±11h of UTC.
  // For Europe/London (UTC or UTC+1) this always falls on the correct calendar day.
  const [year, month, day] = dateStr.split("-").map(Number);
  const noon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(noon);

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.indexOf(dayName);
}

/**
 * Format a UTC Date as "HH:MM" in the given timezone.
 */
export function utcToTimeStr(utc: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(utc);

  const h = parts.find((p) => p.type === "hour")!.value;
  const m = parts.find((p) => p.type === "minute")!.value;
  return `${h}:${m}`;
}

/**
 * Return the YYYY-MM-DD date string for a UTC instant in the given timezone.
 */
export function utcToDateStr(utc: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(utc);
}

// ── Slot generation ───────────────────────────────────────────────────────────

/** Slot interval in minutes — how far apart consecutive slot start times are. */
const SLOT_INTERVAL_MINS = 15;

/**
 * Check whether a PENDING appointment still holds its slot.
 * A PENDING appointment with no holdExpiresAt (null) holds indefinitely.
 */
function isHoldActive(appt: AppointmentInput, now: Date): boolean {
  if (appt.holdExpiresAt === null) return true;
  return appt.holdExpiresAt > now;
}

/**
 * Check whether an appointment should be treated as a conflict.
 */
function isBlockingAppointment(appt: AppointmentInput, now: Date): boolean {
  if (appt.status === "CANCELLED" || appt.status === "RESCHEDULED") return false;
  if (appt.status === "PENDING") return isHoldActive(appt, now);
  return true; // CONFIRMED, COMPLETED, NO_SHOW all block slots
}

interface Interval {
  start: Date;
  end: Date; // exclusive upper bound
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * Build the set of blocked UTC intervals for a specific date.
 * Includes: blocked periods (raw UTC) and active appointments.
 */
export function buildConflicts(
  dateStr: string,
  timezone: string,
  blockedPeriods: BlockedPeriodInput[],
  appointments: AppointmentInput[],
  now: Date,
): Interval[] {
  const conflicts: Interval[] = [];

  // Day boundaries in UTC (for allDay check)
  const dayStart = wallClockToUtc(dateStr, "00:00", timezone);
  const dayEnd = wallClockToUtc(dateStr, "24:00", timezone); // next midnight

  for (const bp of blockedPeriods) {
    if (bp.allDay) {
      // If the blocked period's date range includes this date, block the whole day
      if (bp.startAt < dayEnd && bp.endAt > dayStart) {
        conflicts.push({ start: dayStart, end: dayEnd });
      }
    } else {
      // Only include if it overlaps the day at all (optimisation, not required for correctness)
      if (bp.startAt < dayEnd && bp.endAt > dayStart) {
        conflicts.push({ start: bp.startAt, end: bp.endAt });
      }
    }
  }

  for (const appt of appointments) {
    if (!isBlockingAppointment(appt, now)) continue;
    // Effective end includes the buffer time after the appointment
    const effectiveEnd = new Date(
      appt.endAt.getTime() + appt.bufferMins * 60_000,
    );
    conflicts.push({ start: appt.startAt, end: effectiveEnd });
  }

  return conflicts;
}

/**
 * Calculate available time slots for a single date.
 *
 * @returns Array of "HH:MM" strings in the business timezone.
 */
export function getSlotsForDate(params: {
  dateStr: string; // "YYYY-MM-DD" in business timezone
  service: ServiceInput;
  rules: AvailabilityRuleInput[];
  blockedPeriods: BlockedPeriodInput[];
  appointments: AppointmentInput[];
  settings: AvailabilitySettings;
  now?: Date;
}): string[] {
  const { dateStr, service, rules, blockedPeriods, appointments, settings } = params;
  const now = params.now ?? new Date();
  const { timezone, minNoticeHours } = settings;

  const totalMins = service.durationMins + service.bufferMins;

  // Minimum start time: now + minNoticeHours
  const minStart = new Date(now.getTime() + minNoticeHours * 3_600_000);

  // Day of week for this date (in business timezone)
  const dow = getDayOfWeek(dateStr, timezone);

  // Active rules for this day of week
  const dayRules = rules.filter((r) => r.dayOfWeek === dow && r.active);
  if (dayRules.length === 0) return [];

  // Build conflict intervals for this date
  const conflicts = buildConflicts(
    dateStr,
    timezone,
    blockedPeriods,
    appointments,
    now,
  );

  const slots: string[] = [];

  for (const rule of dayRules) {
    const periodStart = wallClockToUtc(dateStr, rule.startTime, timezone);
    const periodEnd = wallClockToUtc(dateStr, rule.endTime, timezone);

    if (periodEnd <= periodStart) continue; // malformed rule

    // Align first slot to the SLOT_INTERVAL_MINS grid from the period start
    let slotStart = periodStart;

    // Generate slots until the service no longer fits
    while (true) {
      const slotEnd = new Date(slotStart.getTime() + totalMins * 60_000);

      // Does the appointment (including buffer) fit within the working period?
      if (slotEnd > periodEnd) break;

      // Is the slot after the minimum notice window?
      if (slotStart >= minStart) {
        // Build the slot interval (just the appointment, not buffer — buffer is for
        // checking conflicts against others, not for fitting in the period)
        const slotInterval: Interval = { start: slotStart, end: slotEnd };

        // Is this slot free?
        if (!conflicts.some((c) => overlaps(slotInterval, c))) {
          slots.push(utcToTimeStr(slotStart, timezone));
        }
      }

      slotStart = new Date(slotStart.getTime() + SLOT_INTERVAL_MINS * 60_000);
    }
  }

  return slots;
}

// ── Multi-day helpers ─────────────────────────────────────────────────────────

/**
 * Return YYYY-MM-DD strings for each day that has at least one available slot
 * within the given date range (inclusive).
 */
export function getAvailableDatesInRange(params: {
  fromDateStr: string; // "YYYY-MM-DD"
  toDateStr: string;   // "YYYY-MM-DD"
  service: ServiceInput;
  rules: AvailabilityRuleInput[];
  blockedPeriods: BlockedPeriodInput[];
  appointments: AppointmentInput[];
  settings: AvailabilitySettings;
  now?: Date;
}): string[] {
  const { fromDateStr, toDateStr, service, rules, blockedPeriods, appointments, settings } = params;
  const now = params.now ?? new Date();
  const available: string[] = [];

  const [fy, fm, fd] = fromDateStr.split("-").map(Number);
  const [ty, tm, td] = toDateStr.split("-").map(Number);

  let current = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));

  while (current <= end) {
    const dateStr = utcToDateStr(current, "UTC"); // YYYY-MM-DD in UTC = same as input for midnight
    const slots = getSlotsForDate({
      dateStr,
      service,
      rules,
      blockedPeriods,
      appointments,
      settings,
      now,
    });
    if (slots.length > 0) available.push(dateStr);
    current = new Date(current.getTime() + 86_400_000);
  }

  return available;
}

/**
 * Check whether a specific slot (dateStr + timeStr) is still available.
 * Used for server-side re-validation before booking creation (Phase 8).
 */
export function isSlotAvailable(params: {
  dateStr: string;
  timeStr: string; // "HH:MM"
  service: ServiceInput;
  rules: AvailabilityRuleInput[];
  blockedPeriods: BlockedPeriodInput[];
  appointments: AppointmentInput[];
  settings: AvailabilitySettings;
  now?: Date;
}): boolean {
  const slots = getSlotsForDate({ ...params, now: params.now });
  return slots.includes(params.timeStr);
}

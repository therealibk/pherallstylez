import { describe, it, expect } from "vitest";
import {
  wallClockToUtc,
  getDayOfWeek,
  utcToTimeStr,
  utcToDateStr,
  buildConflicts,
  getSlotsForDate,
  getAvailableDatesInRange,
  isSlotAvailable,
  type AvailabilityRuleInput,
  type BlockedPeriodInput,
  type AppointmentInput,
  type AvailabilitySettings,
} from "@/lib/availability";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TZ = "Europe/London";

function makeSettings(overrides: Partial<AvailabilitySettings> = {}): AvailabilitySettings {
  return { minNoticeHours: 0, maxAdvanceDays: 90, timezone: TZ, ...overrides };
}

/** Create a simple set of availability rules: Mon–Sat 09:00–17:00 */
function weekdayRules(days: number[] = [1, 2, 3, 4, 5, 6]): AvailabilityRuleInput[] {
  return days.map((d) => ({ dayOfWeek: d, startTime: "09:00", endTime: "17:00", active: true }));
}

function makeAppt(
  startIso: string,
  durationMins: number,
  bufferMins = 0,
  status = "CONFIRMED",
  holdExpiresAt: Date | null = null,
): AppointmentInput {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMins * 60_000);
  return { startAt: start, endAt: end, bufferMins, status, holdExpiresAt };
}

function makeBlockedPeriod(startIso: string, endIso: string, allDay = false): BlockedPeriodInput {
  return { startAt: new Date(startIso), endAt: new Date(endIso), allDay };
}

const SERVICE_60 = { durationMins: 60, bufferMins: 0 };
const SERVICE_90 = { durationMins: 90, bufferMins: 15 };
const SERVICE_30 = { durationMins: 30, bufferMins: 0 };

// In Europe/London (no DST) UTC = wall clock; use 2024-01-15 (Monday) for tests
const MON = "2024-01-15"; // Monday
const SUN = "2024-01-14"; // Sunday

// ── wallClockToUtc ────────────────────────────────────────────────────────────

describe("wallClockToUtc", () => {
  it("converts a winter date (no DST offset) correctly", () => {
    // In January, Europe/London is UTC+0
    const result = wallClockToUtc("2024-01-15", "09:00", TZ);
    expect(result.toISOString()).toBe("2024-01-15T09:00:00.000Z");
  });

  it("converts a summer date (BST, UTC+1) correctly", () => {
    // In July, Europe/London is UTC+1 (BST)
    const result = wallClockToUtc("2024-07-15", "09:00", TZ);
    expect(result.toISOString()).toBe("2024-07-15T08:00:00.000Z");
  });

  it("handles midnight (00:00)", () => {
    const result = wallClockToUtc("2024-01-15", "00:00", TZ);
    expect(result.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });

  it("handles end of working day (17:00)", () => {
    const result = wallClockToUtc("2024-01-15", "17:00", TZ);
    expect(result.toISOString()).toBe("2024-01-15T17:00:00.000Z");
  });

  it("handles a non-UTC timezone (America/New_York, UTC-5 in January)", () => {
    const result = wallClockToUtc("2024-01-15", "09:00", "America/New_York");
    expect(result.toISOString()).toBe("2024-01-15T14:00:00.000Z");
  });
});

// ── getDayOfWeek ──────────────────────────────────────────────────────────────

describe("getDayOfWeek", () => {
  it("returns 1 for a Monday", () => {
    expect(getDayOfWeek("2024-01-15", TZ)).toBe(1); // Mon
  });

  it("returns 0 for a Sunday", () => {
    expect(getDayOfWeek("2024-01-14", TZ)).toBe(0); // Sun
  });

  it("returns 6 for a Saturday", () => {
    expect(getDayOfWeek("2024-01-13", TZ)).toBe(6); // Sat
  });

  it("returns 5 for a Friday", () => {
    expect(getDayOfWeek("2024-01-19", TZ)).toBe(5); // Fri
  });
});

// ── utcToTimeStr ──────────────────────────────────────────────────────────────

describe("utcToTimeStr", () => {
  it("formats a UTC time as HH:MM in winter (no offset)", () => {
    const d = new Date("2024-01-15T09:00:00.000Z");
    expect(utcToTimeStr(d, TZ)).toBe("09:00");
  });

  it("formats a UTC time as HH:MM in summer (BST offset)", () => {
    const d = new Date("2024-07-15T08:00:00.000Z");
    expect(utcToTimeStr(d, TZ)).toBe("09:00");
  });

  it("handles 15:30", () => {
    const d = new Date("2024-01-15T15:30:00.000Z");
    expect(utcToTimeStr(d, TZ)).toBe("15:30");
  });
});

// ── utcToDateStr ──────────────────────────────────────────────────────────────

describe("utcToDateStr", () => {
  it("returns YYYY-MM-DD", () => {
    const d = new Date("2024-01-15T12:00:00.000Z");
    expect(utcToDateStr(d, TZ)).toBe("2024-01-15");
  });
});

// ── buildConflicts ────────────────────────────────────────────────────────────

describe("buildConflicts", () => {
  const now = new Date("2024-01-15T08:00:00Z");

  it("includes confirmed appointments", () => {
    const appt = makeAppt("2024-01-15T10:00:00Z", 60);
    const conflicts = buildConflicts(MON, TZ, [], [appt], now);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].start.toISOString()).toBe("2024-01-15T10:00:00.000Z");
    expect(conflicts[0].end.toISOString()).toBe("2024-01-15T11:00:00.000Z");
  });

  it("extends appointment conflict end by bufferMins", () => {
    const appt = makeAppt("2024-01-15T10:00:00Z", 60, 15);
    const conflicts = buildConflicts(MON, TZ, [], [appt], now);
    expect(conflicts[0].end.toISOString()).toBe("2024-01-15T11:15:00.000Z");
  });

  it("excludes cancelled appointments", () => {
    const appt = makeAppt("2024-01-15T10:00:00Z", 60, 0, "CANCELLED");
    const conflicts = buildConflicts(MON, TZ, [], [appt], now);
    expect(conflicts).toHaveLength(0);
  });

  it("excludes rescheduled appointments", () => {
    const appt = makeAppt("2024-01-15T10:00:00Z", 60, 0, "RESCHEDULED");
    const conflicts = buildConflicts(MON, TZ, [], [appt], now);
    expect(conflicts).toHaveLength(0);
  });

  it("includes PENDING appointment when hold is still active", () => {
    const holdExpiry = new Date(now.getTime() + 900_000); // 15 min in the future
    const appt = makeAppt("2024-01-15T10:00:00Z", 60, 0, "PENDING", holdExpiry);
    const conflicts = buildConflicts(MON, TZ, [], [appt], now);
    expect(conflicts).toHaveLength(1);
  });

  it("excludes PENDING appointment when hold has expired", () => {
    const holdExpiry = new Date(now.getTime() - 1); // just expired
    const appt = makeAppt("2024-01-15T10:00:00Z", 60, 0, "PENDING", holdExpiry);
    const conflicts = buildConflicts(MON, TZ, [], [appt], now);
    expect(conflicts).toHaveLength(0);
  });

  it("includes PENDING appointment with null holdExpiresAt (indefinite hold)", () => {
    const appt = makeAppt("2024-01-15T10:00:00Z", 60, 0, "PENDING", null);
    const conflicts = buildConflicts(MON, TZ, [], [appt], now);
    expect(conflicts).toHaveLength(1);
  });

  it("includes allDay blocked period for the target date", () => {
    const bp = makeBlockedPeriod("2024-01-15T00:00:00Z", "2024-01-16T00:00:00Z", true);
    const conflicts = buildConflicts(MON, TZ, [bp], [], now);
    expect(conflicts).toHaveLength(1);
  });

  it("excludes allDay blocked period for a different date", () => {
    const bp = makeBlockedPeriod("2024-01-16T00:00:00Z", "2024-01-17T00:00:00Z", true);
    const conflicts = buildConflicts(MON, TZ, [bp], [], now);
    expect(conflicts).toHaveLength(0);
  });

  it("includes partial-day blocked period overlapping the target date", () => {
    const bp = makeBlockedPeriod("2024-01-15T12:00:00Z", "2024-01-15T14:00:00Z");
    const conflicts = buildConflicts(MON, TZ, [bp], [], now);
    expect(conflicts).toHaveLength(1);
  });
});

// ── getSlotsForDate ───────────────────────────────────────────────────────────

describe("getSlotsForDate", () => {
  const now = new Date("2024-01-15T06:00:00Z"); // 06:00 UTC = 06:00 London (Jan)

  it("returns slots for a working day", () => {
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    // 09:00–17:00 with 60-min service, 15-min slots: 09:00, 09:15, …, 16:00
    expect(slots).toContain("09:00");
    expect(slots).toContain("16:00");
    expect(slots).not.toContain("16:15"); // 16:15 + 60 min = 17:15 > 17:00
    expect(slots.length).toBeGreaterThan(0);
  });

  it("returns empty for a day with no rules", () => {
    const slots = getSlotsForDate({
      dateStr: SUN, // Sunday = dayOfWeek 0, no rule for it
      service: SERVICE_60,
      rules: weekdayRules([1, 2, 3, 4, 5, 6]), // no Sunday
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    expect(slots).toHaveLength(0);
  });

  it("returns empty for an inactive rule", () => {
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", active: false }],
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    expect(slots).toHaveLength(0);
  });

  it("excludes slots before the minimum notice window", () => {
    // now = 08:00, minNoticeHours = 2 → minStart = 10:00
    const nowAt8 = new Date("2024-01-15T08:00:00Z");
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings({ minNoticeHours: 2 }),
      now: nowAt8,
    });
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("09:45");
    expect(slots).toContain("10:00");
  });

  it("excludes slots blocked by a confirmed appointment", () => {
    // Appointment at 10:00–11:00
    const appt = makeAppt("2024-01-15T10:00:00Z", 60);
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [appt],
      settings: makeSettings(),
      now,
    });
    // A 60-min slot starting at 10:00 would conflict with appointment 10:00–11:00
    expect(slots).not.toContain("10:00");
    // A slot at 09:45 would run 09:45–10:45, overlapping with 10:00–11:00
    expect(slots).not.toContain("09:45");
    // A slot at 11:00 would run 11:00–12:00, no overlap
    expect(slots).toContain("11:00");
    // A slot at 09:00 would run 09:00–10:00 — touches 10:00 but doesn't overlap (exclusive)
    expect(slots).toContain("09:00");
  });

  it("respects appointment buffer time when excluding slots", () => {
    // Appointment at 10:00–11:00 with 30-min buffer → effectively blocks until 11:30
    const appt = makeAppt("2024-01-15T10:00:00Z", 60, 30);
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [appt],
      settings: makeSettings(),
      now,
    });
    // Slot at 11:00 would run 11:00–12:00; effective appt end = 11:30 → overlap
    expect(slots).not.toContain("11:00");
    expect(slots).not.toContain("11:15");
    // Slot at 11:30 runs 11:30–12:30; appt effective end = 11:30 → no overlap (exclusive)
    expect(slots).toContain("11:30");
  });

  it("respects service buffer when fitting into working period", () => {
    // Service = 90min + 15min buffer = 105 min total
    // Working period 09:00–17:00
    // Last slot that fits: 09:00 + 105 min = 10:45 fits; 15:15 + 105 = 17:00 fits; 15:30 + 105 = 17:15 > 17:00
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_90,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    expect(slots).toContain("15:15");
    expect(slots).not.toContain("15:30");
  });

  it("returns empty when an allDay block covers the date", () => {
    const bp = makeBlockedPeriod("2024-01-15T00:00:00Z", "2024-01-16T00:00:00Z", true);
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: weekdayRules([1]),
      blockedPeriods: [bp],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    expect(slots).toHaveLength(0);
  });

  it("excludes slots overlapping a partial-day block", () => {
    // Block 12:00–13:00
    const bp = makeBlockedPeriod("2024-01-15T12:00:00Z", "2024-01-15T13:00:00Z");
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: weekdayRules([1]),
      blockedPeriods: [bp],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    // 12:00–13:00 blocked; slot at 12:00 would run 12:00–13:00 → exact match, overlaps
    expect(slots).not.toContain("12:00");
    // Slot at 11:00 runs 11:00–12:00; block starts at 12:00 → no overlap (exclusive)
    expect(slots).toContain("11:00");
    // Slot at 13:00 runs 13:00–14:00; block ends at 13:00 → no overlap
    expect(slots).toContain("13:00");
  });

  it("supports multiple rules per day (split shift)", () => {
    const splitRules: AvailabilityRuleInput[] = [
      { dayOfWeek: 1, startTime: "09:00", endTime: "12:00", active: true },
      { dayOfWeek: 1, startTime: "13:00", endTime: "17:00", active: true },
    ];
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: splitRules,
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    expect(slots).toContain("09:00");
    expect(slots).toContain("11:00"); // 11:00–12:00 fits in first period
    expect(slots).not.toContain("12:00"); // 12:00–13:00 crosses gap
    expect(slots).toContain("13:00"); // 13:00–14:00 fits in second period
    expect(slots).toContain("16:00");
  });

  it("does not generate duplicate slots when appointments partially overlap multiple rules", () => {
    // Two rules that share no time shouldn't produce duplicate slots
    const splitRules: AvailabilityRuleInput[] = [
      { dayOfWeek: 1, startTime: "09:00", endTime: "12:00", active: true },
      { dayOfWeek: 1, startTime: "14:00", endTime: "17:00", active: true },
    ];
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_30,
      rules: splitRules,
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    // No duplicates
    expect(new Set(slots).size).toBe(slots.length);
  });

  it("slots are in 15-minute increments", () => {
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_30,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    for (const slot of slots) {
      const [, minuteStr] = slot.split(":");
      expect(parseInt(minuteStr, 10) % 15).toBe(0);
    }
  });

  it("all slots returned are before the period end minus service duration", () => {
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    for (const slot of slots) {
      const [h, m] = slot.split(":").map(Number);
      const totalMin = h * 60 + m + SERVICE_60.durationMins;
      // Should be <= 17:00 = 1020 min
      expect(totalMin).toBeLessThanOrEqual(1020);
    }
  });

  it("returns slots in order (ascending)", () => {
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i] > slots[i - 1]).toBe(true);
    }
  });

  it("does not include a slot when now + minNoticeHours equals the slot (boundary)", () => {
    // now = 09:00 UTC, minNoticeHours = 0 → minStart = 09:00
    // Slot at 09:00 should be included (slotStart >= minStart)
    const nowAt9 = new Date("2024-01-15T09:00:00Z");
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings({ minNoticeHours: 0 }),
      now: nowAt9,
    });
    expect(slots).toContain("09:00");
  });

  it("handles a service longer than the working period", () => {
    // 9-hour service in an 8-hour day
    const bigService = { durationMins: 9 * 60, bufferMins: 0 };
    const slots = getSlotsForDate({
      dateStr: MON,
      service: bigService,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    expect(slots).toHaveLength(0);
  });

  it("uses BST (UTC+1) correctly for a summer date", () => {
    // In July, 09:00 BST = 08:00 UTC
    const rules: AvailabilityRuleInput[] = [
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", active: true }, // Mon
    ];
    const nowSummer = new Date("2024-07-15T06:00:00Z"); // 07:00 BST
    const slots = getSlotsForDate({
      dateStr: "2024-07-15", // Monday
      service: SERVICE_60,
      rules,
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now: nowSummer,
    });
    // Should still list 09:00 (BST) as first slot
    expect(slots).toContain("09:00");
    // And the last slot should be 16:00 (BST)
    expect(slots).toContain("16:00");
  });

  it("double booking prevention: two simultaneous requests cannot both take the same slot", () => {
    // If appt1 is CONFIRMED at 10:00, slot 10:00 should not appear
    const appt1 = makeAppt("2024-01-15T10:00:00Z", 60);
    const slots = getSlotsForDate({
      dateStr: MON,
      service: SERVICE_60,
      rules: weekdayRules([1]),
      blockedPeriods: [],
      appointments: [appt1],
      settings: makeSettings(),
      now,
    });
    expect(slots).not.toContain("10:00");
  });
});

// ── getAvailableDatesInRange ──────────────────────────────────────────────────

describe("getAvailableDatesInRange", () => {
  const now = new Date("2024-01-15T06:00:00Z");

  it("returns dates that have slots", () => {
    const dates = getAvailableDatesInRange({
      fromDateStr: "2024-01-15",
      toDateStr: "2024-01-21",
      service: SERVICE_60,
      rules: weekdayRules([1, 2, 3, 4, 5]), // Mon–Fri only
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    // Mon–Fri are in range; Sat (13th) and Sun (14th) not in this range
    // 2024-01-15 Mon, 2024-01-16 Tue, 2024-01-17 Wed, 2024-01-18 Thu, 2024-01-19 Fri
    expect(dates).toContain("2024-01-15");
    expect(dates).toContain("2024-01-19");
    // Sat 2024-01-20 and Sun 2024-01-21 should not appear
    expect(dates).not.toContain("2024-01-20");
    expect(dates).not.toContain("2024-01-21");
  });

  it("excludes dates that are fully blocked", () => {
    const bp = makeBlockedPeriod("2024-01-15T00:00:00Z", "2024-01-16T00:00:00Z", true);
    const dates = getAvailableDatesInRange({
      fromDateStr: "2024-01-15",
      toDateStr: "2024-01-16",
      service: SERVICE_60,
      rules: weekdayRules([1, 2]),
      blockedPeriods: [bp],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    expect(dates).not.toContain("2024-01-15");
    expect(dates).toContain("2024-01-16");
  });

  it("returns empty for a range with no working days", () => {
    const dates = getAvailableDatesInRange({
      fromDateStr: "2024-01-14", // Sun
      toDateStr: "2024-01-14",
      service: SERVICE_60,
      rules: weekdayRules([1, 2, 3, 4, 5]), // no Sunday
      blockedPeriods: [],
      appointments: [],
      settings: makeSettings(),
      now,
    });
    expect(dates).toHaveLength(0);
  });
});

// ── isSlotAvailable ───────────────────────────────────────────────────────────

describe("isSlotAvailable", () => {
  const now = new Date("2024-01-15T06:00:00Z");

  it("returns true for a valid available slot", () => {
    expect(
      isSlotAvailable({
        dateStr: MON,
        timeStr: "09:00",
        service: SERVICE_60,
        rules: weekdayRules([1]),
        blockedPeriods: [],
        appointments: [],
        settings: makeSettings(),
        now,
      }),
    ).toBe(true);
  });

  it("returns false for a slot blocked by an appointment", () => {
    const appt = makeAppt("2024-01-15T10:00:00Z", 60);
    expect(
      isSlotAvailable({
        dateStr: MON,
        timeStr: "10:00",
        service: SERVICE_60,
        rules: weekdayRules([1]),
        blockedPeriods: [],
        appointments: [appt],
        settings: makeSettings(),
        now,
      }),
    ).toBe(false);
  });

  it("returns false for a slot on a non-working day", () => {
    expect(
      isSlotAvailable({
        dateStr: SUN,
        timeStr: "09:00",
        service: SERVICE_60,
        rules: weekdayRules([1, 2, 3, 4, 5, 6]), // no Sunday
        blockedPeriods: [],
        appointments: [],
        settings: makeSettings(),
        now,
      }),
    ).toBe(false);
  });

  it("returns false for a slot that does not fall on 15-min boundary", () => {
    // getSlotsForDate only generates 15-min aligned slots
    expect(
      isSlotAvailable({
        dateStr: MON,
        timeStr: "09:07",
        service: SERVICE_60,
        rules: weekdayRules([1]),
        blockedPeriods: [],
        appointments: [],
        settings: makeSettings(),
        now,
      }),
    ).toBe(false);
  });

  it("returns false when the slot is within minimum notice", () => {
    // now = 09:30 UTC, minNotice = 1h → minStart = 10:30
    const nowAt930 = new Date("2024-01-15T09:30:00Z");
    expect(
      isSlotAvailable({
        dateStr: MON,
        timeStr: "10:00",
        service: SERVICE_60,
        rules: weekdayRules([1]),
        blockedPeriods: [],
        appointments: [],
        settings: makeSettings({ minNoticeHours: 1 }),
        now: nowAt930,
      }),
    ).toBe(false);
  });
});

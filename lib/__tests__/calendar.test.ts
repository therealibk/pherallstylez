import { describe, it, expect } from "vitest";
import { expandBlockedPeriods, type StoredBlockedPeriod } from "@/lib/availability";

// ── expandBlockedPeriods tests ─────────────────────────────────────────────────

const day = (dateStr: string, timeStr = "00:00"): Date =>
  new Date(`${dateStr}T${timeStr}:00.000Z`);

function makePeriod(
  start: string,
  end: string,
  recurrence: "NONE" | "WEEKLY" | "MONTHLY" = "NONE",
  recurrenceEndDate: Date | null = null,
): StoredBlockedPeriod {
  return {
    startAt: new Date(start),
    endAt: new Date(end),
    allDay: false,
    recurrence,
    recurrenceEndDate,
  };
}

describe("expandBlockedPeriods", () => {
  describe("NONE recurrence", () => {
    it("returns the period when it overlaps the query range", () => {
      const period = makePeriod("2026-08-10T09:00:00Z", "2026-08-10T10:00:00Z");
      const result = expandBlockedPeriods([period], day("2026-08-01"), day("2026-08-31"));
      expect(result).toHaveLength(1);
      expect(result[0].startAt).toEqual(period.startAt);
    });

    it("excludes period entirely before the query range", () => {
      const period = makePeriod("2026-07-01T09:00:00Z", "2026-07-01T10:00:00Z");
      const result = expandBlockedPeriods([period], day("2026-08-01"), day("2026-08-31"));
      expect(result).toHaveLength(0);
    });

    it("excludes period entirely after the query range", () => {
      const period = makePeriod("2026-09-01T09:00:00Z", "2026-09-01T10:00:00Z");
      const result = expandBlockedPeriods([period], day("2026-08-01"), day("2026-08-31"));
      expect(result).toHaveLength(0);
    });

    it("includes period that starts before and ends inside the range", () => {
      const period = makePeriod("2026-07-31T23:00:00Z", "2026-08-01T01:00:00Z");
      const result = expandBlockedPeriods([period], day("2026-08-01"), day("2026-08-31"));
      expect(result).toHaveLength(1);
    });
  });

  describe("WEEKLY recurrence", () => {
    it("generates an occurrence every 7 days within the range", () => {
      // Monday 2026-08-03, weekly — use Sep 1 as exclusive upper bound so Aug 31 is included
      const period = makePeriod("2026-08-03T09:00:00Z", "2026-08-03T10:00:00Z", "WEEKLY");
      const from = day("2026-08-01");
      const to = day("2026-09-01"); // exclusive upper bound — typical for calendar ranges
      const result = expandBlockedPeriods([period], from, to);
      // Should get: Aug 3, 10, 17, 24, 31
      expect(result).toHaveLength(5);
      expect(result[0].startAt.toISOString()).toBe("2026-08-03T09:00:00.000Z");
      expect(result[1].startAt.toISOString()).toBe("2026-08-10T09:00:00.000Z");
      expect(result[4].startAt.toISOString()).toBe("2026-08-31T09:00:00.000Z");
    });

    it("respects recurrenceEndDate — stops expanding after it", () => {
      // recurrenceEndDate at 23:59 of end day (matching what the form stores)
      const period = makePeriod(
        "2026-08-03T09:00:00Z",
        "2026-08-03T10:00:00Z",
        "WEEKLY",
        new Date("2026-08-17T23:59:00Z"), // ends after 3 occurrences (stored at 23:59)
      );
      const result = expandBlockedPeriods([period], day("2026-08-01"), day("2026-09-01"));
      // Aug 3, 10, 17 (cursor 09:00Z ≤ cutoff 23:59Z for Aug 17)
      expect(result).toHaveLength(3);
    });

    it("preserves the duration of each occurrence", () => {
      const period = makePeriod("2026-08-03T09:00:00Z", "2026-08-03T11:00:00Z", "WEEKLY");
      const result = expandBlockedPeriods([period], day("2026-08-01"), day("2026-08-31"));
      const durationMs = 2 * 60 * 60 * 1000;
      for (const occ of result) {
        expect(occ.endAt.getTime() - occ.startAt.getTime()).toBe(durationMs);
      }
    });

    it("excludes occurrences before the start of the period", () => {
      // Period starts 2026-08-17; query from 2026-08-01 to Sep 1 (exclusive)
      const period = makePeriod("2026-08-17T09:00:00Z", "2026-08-17T10:00:00Z", "WEEKLY");
      const result = expandBlockedPeriods([period], day("2026-08-01"), day("2026-09-01"));
      // Aug 17, 24, 31 — cursor starts at Aug 17 and the loop includes it
      expect(result).toHaveLength(3);
      expect(result[0].startAt.toISOString()).toBe("2026-08-17T09:00:00.000Z");
    });
  });

  describe("MONTHLY recurrence", () => {
    it("generates one occurrence per month on the same day", () => {
      const period = makePeriod("2026-01-15T09:00:00Z", "2026-01-15T10:00:00Z", "MONTHLY");
      const from = day("2026-01-01");
      const to = day("2026-06-30");
      const result = expandBlockedPeriods([period], from, to);
      // Jan 15, Feb 15, Mar 15, Apr 15, May 15, Jun 15
      expect(result).toHaveLength(6);
      expect(result[0].startAt.getUTCMonth()).toBe(0); // January
      expect(result[5].startAt.getUTCMonth()).toBe(5); // June
    });

    it("respects recurrenceEndDate for monthly", () => {
      const period = makePeriod(
        "2026-01-15T09:00:00Z",
        "2026-01-15T10:00:00Z",
        "MONTHLY",
        day("2026-03-31"),
      );
      const result = expandBlockedPeriods([period], day("2026-01-01"), day("2026-12-31"));
      // Jan 15, Feb 15, Mar 15 (all ≤ Mar 31)
      expect(result).toHaveLength(3);
    });

    it("preserves allDay flag across occurrences", () => {
      const period: StoredBlockedPeriod = {
        startAt: new Date("2026-01-15T00:00:00Z"),
        endAt: new Date("2026-01-16T00:00:00Z"),
        allDay: true,
        recurrence: "MONTHLY",
        recurrenceEndDate: null,
      };
      const result = expandBlockedPeriods([period], day("2026-01-01"), day("2026-03-31"));
      expect(result).toHaveLength(3);
      for (const occ of result) {
        expect(occ.allDay).toBe(true);
      }
    });
  });

  describe("multiple periods", () => {
    it("expands all periods and concatenates results", () => {
      const p1 = makePeriod("2026-08-04T09:00:00Z", "2026-08-04T10:00:00Z", "WEEKLY");
      const p2 = makePeriod("2026-08-10T14:00:00Z", "2026-08-10T15:00:00Z", "NONE");
      const result = expandBlockedPeriods([p1, p2], day("2026-08-01"), day("2026-08-31"));
      // p1 weekly: Aug 4, 11, 18, 25 = 4 occurrences; p2: 1 occurrence
      expect(result.length).toBeGreaterThanOrEqual(5);
    });

    it("returns empty array for empty input", () => {
      expect(expandBlockedPeriods([], day("2026-08-01"), day("2026-08-31"))).toHaveLength(0);
    });
  });
});

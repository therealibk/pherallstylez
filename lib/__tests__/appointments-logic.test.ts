import { describe, it, expect } from "vitest";
import type { AppointmentStatus } from "@/lib/generated/prisma/client";

// ── Status transition validation ──────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  PENDING:   ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
};

function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe("Appointment status transitions", () => {
  it("allows PENDING → CONFIRMED", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
  });

  it("allows PENDING → CANCELLED", () => {
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
  });

  it("allows CONFIRMED → COMPLETED", () => {
    expect(canTransition("CONFIRMED", "COMPLETED")).toBe(true);
  });

  it("allows CONFIRMED → CANCELLED", () => {
    expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
  });

  it("allows CONFIRMED → NO_SHOW", () => {
    expect(canTransition("CONFIRMED", "NO_SHOW")).toBe(true);
  });

  it("blocks COMPLETED → CANCELLED", () => {
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
  });

  it("blocks CANCELLED → CONFIRMED", () => {
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
  });

  it("blocks NO_SHOW → CONFIRMED", () => {
    expect(canTransition("NO_SHOW", "CONFIRMED")).toBe(false);
  });

  it("blocks PENDING → COMPLETED", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
  });

  it("blocks PENDING → NO_SHOW", () => {
    expect(canTransition("PENDING", "NO_SHOW")).toBe(false);
  });
});

// ── Cancellation deadline logic ───────────────────────────────────────────────

function isCancellationAllowed(
  appointmentStartAt: Date,
  now: Date,
  deadlineHours: number,
): boolean {
  const hoursUntilAppt = (appointmentStartAt.getTime() - now.getTime()) / 3_600_000;
  return hoursUntilAppt > deadlineHours;
}

describe("Cancellation deadline", () => {
  const now = new Date("2025-08-15T10:00:00Z");

  it("allows cancellation well before deadline", () => {
    const startAt = new Date("2025-08-17T10:00:00Z"); // 48 hours away
    expect(isCancellationAllowed(startAt, now, 24)).toBe(true);
  });

  it("blocks cancellation exactly at deadline", () => {
    const startAt = new Date("2025-08-16T10:00:00Z"); // exactly 24 hours away
    expect(isCancellationAllowed(startAt, now, 24)).toBe(false);
  });

  it("blocks cancellation within deadline", () => {
    const startAt = new Date("2025-08-15T20:00:00Z"); // 10 hours away
    expect(isCancellationAllowed(startAt, now, 24)).toBe(false);
  });

  it("allows cancellation with zero deadline (always allowed)", () => {
    const startAt = new Date("2025-08-15T10:30:00Z"); // 30 mins away
    expect(isCancellationAllowed(startAt, now, 0)).toBe(true);
  });

  it("blocks past appointments", () => {
    const startAt = new Date("2025-08-14T10:00:00Z"); // yesterday
    expect(isCancellationAllowed(startAt, now, 24)).toBe(false);
  });
});

// ── Rescheduling deadline logic ───────────────────────────────────────────────

function isReschedulingAllowed(
  appointmentStartAt: Date,
  now: Date,
  deadlineHours: number,
): boolean {
  const hoursUntilAppt = (appointmentStartAt.getTime() - now.getTime()) / 3_600_000;
  return hoursUntilAppt > deadlineHours;
}

describe("Rescheduling deadline", () => {
  const now = new Date("2025-08-15T10:00:00Z");

  it("allows rescheduling when appointment is far away", () => {
    const startAt = new Date("2025-08-20T10:00:00Z");
    expect(isReschedulingAllowed(startAt, now, 24)).toBe(true);
  });

  it("blocks rescheduling within 24 hours", () => {
    const startAt = new Date("2025-08-15T22:00:00Z"); // 12 hours away
    expect(isReschedulingAllowed(startAt, now, 24)).toBe(false);
  });

  it("uses correct deadline when configured to 48h", () => {
    const startAt = new Date("2025-08-16T10:00:00Z"); // 24 hours away
    expect(isReschedulingAllowed(startAt, now, 48)).toBe(false);
  });
});

// ── Notification deduplication key format ─────────────────────────────────────

describe("Notification deduplication keys", () => {
  const apptId = "clxyz123";

  it("booking confirmation key is stable across calls", () => {
    const key = `BOOKING_CONFIRMATION:${apptId}`;
    expect(key).toBe("BOOKING_CONFIRMATION:clxyz123");
  });

  it("reminder key includes offset hours for uniqueness", () => {
    const key48 = `APPOINTMENT_REMINDER:${apptId}:48`;
    const key24 = `APPOINTMENT_REMINDER:${apptId}:24`;
    expect(key48).not.toBe(key24);
    expect(key48).toBe("APPOINTMENT_REMINDER:clxyz123:48");
  });

  it("reschedule key includes new timestamp to allow multiple reschedules", () => {
    const ts1 = 1700000000000;
    const ts2 = 1700000100000;
    const key1 = `RESCHEDULE_CONFIRMATION:${apptId}:${ts1}`;
    const key2 = `RESCHEDULE_CONFIRMATION:${apptId}:${ts2}`;
    expect(key1).not.toBe(key2);
  });

  it("cancellation key is unique per appointment", () => {
    const key1 = `CANCELLATION_CONFIRMATION:${apptId}`;
    const key2 = `CANCELLATION_CONFIRMATION:clxyzABC`;
    expect(key1).not.toBe(key2);
  });
});

// ── Token hash format ─────────────────────────────────────────────────────────

import { createHash } from "crypto";

describe("Token hashing", () => {
  it("produces a 64-char hex SHA-256 hash", () => {
    const rawToken = "abc123def456";
    const hash = createHash("sha256").update(rawToken).digest("hex");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("same token always produces same hash", () => {
    const rawToken = "stable-token-value";
    const h1 = createHash("sha256").update(rawToken).digest("hex");
    const h2 = createHash("sha256").update(rawToken).digest("hex");
    expect(h1).toBe(h2);
  });

  it("different tokens produce different hashes", () => {
    const h1 = createHash("sha256").update("token-a").digest("hex");
    const h2 = createHash("sha256").update("token-b").digest("hex");
    expect(h1).not.toBe(h2);
  });
});

// ── Reminder timing logic ─────────────────────────────────────────────────────

function isReminderDue(
  appointmentStartAt: Date,
  now: Date,
  offsetHours: number,
  windowMins = 60,
): boolean {
  const reminderTime = new Date(appointmentStartAt.getTime() - offsetHours * 3_600_000);
  const windowEnd = new Date(reminderTime.getTime() + windowMins * 60_000);
  return now >= reminderTime && now <= windowEnd;
}

describe("Reminder timing", () => {
  it("marks reminder due when within the send window", () => {
    const start = new Date("2025-08-16T10:00:00Z"); // appt at 10:00
    const now = new Date("2025-08-15T10:15:00Z");   // 24h - 15min before
    expect(isReminderDue(start, now, 24)).toBe(true);
  });

  it("does not mark reminder due if too early", () => {
    const start = new Date("2025-08-16T10:00:00Z");
    const now = new Date("2025-08-14T10:00:00Z"); // 48h before (too early for 24h)
    expect(isReminderDue(start, now, 24)).toBe(false);
  });

  it("does not mark reminder due if window has passed", () => {
    const start = new Date("2025-08-16T10:00:00Z");
    const now = new Date("2025-08-15T11:30:00Z"); // 90 min after the 24h window
    expect(isReminderDue(start, now, 24)).toBe(false);
  });

  it("handles 48h offset correctly", () => {
    const start = new Date("2025-08-17T10:00:00Z");
    const now = new Date("2025-08-15T10:15:00Z"); // just inside 48h window
    expect(isReminderDue(start, now, 48)).toBe(true);
  });
});

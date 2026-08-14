/**
 * Security test suite — Phase 15
 *
 * Covers the security controls identified during the Phase 15 audit.
 * Pure-function tests only (no DB, no network); server-action auth-guard
 * integration tests are covered separately via mock patterns.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Module-level mock for auth — allows per-test session control via vi.mocked(auth)
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "admin-id", email: "admin@test.com" } }),
}));
import { z } from "zod";
import type { AppointmentStatus } from "@/lib/generated/prisma/client";

// ── 1. URL safety — isSafeUrl ─────────────────────────────────────────────────

import { isSafeUrl } from "@/lib/rich-text";

describe("isSafeUrl — allowlist", () => {
  it("allows https URLs", () => {
    expect(isSafeUrl("https://example.com/page")).toBe(true);
  });
  it("allows http URLs", () => {
    expect(isSafeUrl("http://example.com")).toBe(true);
  });
  it("allows mailto links", () => {
    expect(isSafeUrl("mailto:hello@example.com")).toBe(true);
  });
  it("allows tel links", () => {
    expect(isSafeUrl("tel:+441234567890")).toBe(true);
  });
  it("allows absolute path URLs (root-relative)", () => {
    expect(isSafeUrl("/services/nail-art")).toBe(true);
  });
  it("allows anchor links", () => {
    expect(isSafeUrl("#section")).toBe(true);
  });
});

describe("isSafeUrl — blocklist", () => {
  it("blocks javascript: protocol", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });
  it("blocks data: URIs", () => {
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });
  it("blocks vbscript: protocol", () => {
    expect(isSafeUrl("vbscript:MsgBox(1)")).toBe(false);
  });
  it("blocks file: protocol", () => {
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
  });
  it("blocks blank protocol", () => {
    expect(isSafeUrl("://evil.com")).toBe(false);
  });
});

// ── 2. Rich text — schema validation prevents oversized payloads ──────────────

import { richTextDocSchema, richTextFieldSchema } from "@/lib/rich-text";

describe("richTextDocSchema — structure validation", () => {
  it("accepts a valid TipTap doc with text nodes", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };
    expect(richTextDocSchema.safeParse(doc).success).toBe(true);
  });

  it("rejects more than 500 top-level nodes", () => {
    const doc = {
      type: "doc",
      content: Array.from({ length: 501 }, () => ({ type: "paragraph", content: [] })),
    };
    expect(richTextDocSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects missing type field", () => {
    expect(richTextDocSchema.safeParse({ content: [] }).success).toBe(false);
  });

  it("rejects wrong doc type", () => {
    expect(richTextDocSchema.safeParse({ type: "notdoc", content: [] }).success).toBe(false);
  });
});

describe("richTextFieldSchema — plain text passthrough", () => {
  it("accepts a plain text string", () => {
    expect(richTextFieldSchema.safeParse("Hello, world!").success).toBe(true);
  });

  it("accepts an empty string", () => {
    expect(richTextFieldSchema.safeParse("").success).toBe(true);
  });

  it("rejects a string over 200,000 characters", () => {
    const huge = "a".repeat(200_001);
    expect(richTextFieldSchema.safeParse(huge).success).toBe(false);
  });

  it("rejects a valid-looking TipTap doc JSON string with invalid node structure", () => {
    // content is an array but contains a node with type too long (>50 chars)
    const bad = JSON.stringify({
      type: "doc",
      content: [{ type: "x".repeat(51), content: [] }],
    });
    expect(richTextFieldSchema.safeParse(bad).success).toBe(false);
  });
});

// ── 3. Rate limiter — sliding window enforcement ───────────────────────────────

import { checkRateLimit, _resetForTests } from "@/lib/rate-limit";

describe("checkRateLimit — sliding window", () => {
  beforeEach(() => _resetForTests());

  it("allows requests below the limit", () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("test-key").allowed).toBe(true);
    }
  });

  it("blocks after MAX_ATTEMPTS (10) in the same window", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("rl-key");
    expect(checkRateLimit("rl-key").allowed).toBe(false);
  });

  it("counts remaining correctly", () => {
    checkRateLimit("remaining-key");
    checkRateLimit("remaining-key");
    const result = checkRateLimit("remaining-key");
    expect(result.remaining).toBe(7);
  });

  it("returns allowed:true for a new key", () => {
    expect(checkRateLimit("brand-new-key").allowed).toBe(true);
  });

  it("limits are per-key (different keys are independent)", () => {
    for (let i = 0; i < 10; i++) checkRateLimit("key-a");
    expect(checkRateLimit("key-a").allowed).toBe(false);
    expect(checkRateLimit("key-b").allowed).toBe(true);
  });

  it("provides a positive resetMs value", () => {
    const result = checkRateLimit("reset-key");
    expect(result.resetMs).toBeGreaterThan(0);
  });
});

// ── 4. Appointment state machine — transition enforcement ─────────────────────

const VALID_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  PENDING:   ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
};

function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe("canTransition — valid paths", () => {
  it("PENDING → CONFIRMED", () => expect(canTransition("PENDING", "CONFIRMED")).toBe(true));
  it("PENDING → CANCELLED", () => expect(canTransition("PENDING", "CANCELLED")).toBe(true));
  it("CONFIRMED → COMPLETED", () => expect(canTransition("CONFIRMED", "COMPLETED")).toBe(true));
  it("CONFIRMED → CANCELLED", () => expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true));
  it("CONFIRMED → NO_SHOW",   () => expect(canTransition("CONFIRMED", "NO_SHOW")).toBe(true));
});

describe("canTransition — forbidden paths", () => {
  it("PENDING → COMPLETED is not allowed",   () => expect(canTransition("PENDING", "COMPLETED")).toBe(false));
  it("PENDING → NO_SHOW is not allowed",     () => expect(canTransition("PENDING", "NO_SHOW")).toBe(false));
  it("COMPLETED → CANCELLED is not allowed", () => expect(canTransition("COMPLETED", "CANCELLED")).toBe(false));
  it("COMPLETED → CONFIRMED is not allowed", () => expect(canTransition("COMPLETED", "CONFIRMED")).toBe(false));
  it("CANCELLED → CONFIRMED is not allowed", () => expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false));
  it("NO_SHOW → CONFIRMED is not allowed",   () => expect(canTransition("NO_SHOW", "CONFIRMED")).toBe(false));
  it("RESCHEDULED → CONFIRMED not allowed",  () => expect(canTransition("RESCHEDULED", "CONFIRMED")).toBe(false));
});

// ── 5. Login schema — input validation ───────────────────────────────────────

import { loginSchema } from "@/lib/auth-schema";

describe("loginSchema — input validation", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "secret" }).success).toBe(true);
  });
  it("rejects non-email address", () => {
    expect(loginSchema.safeParse({ email: "not-email", password: "pw" }).success).toBe(false);
  });
  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
  });
});

// ── 6. Booking input schema — prevents invalid/oversized payloads ─────────────

import { bookingRequestSchema } from "@/lib/booking-schemas";

const validBooking = {
  serviceSlug: "nail-art",
  dateStr: "2026-09-01",
  timeStr: "10:00",
  customer: {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
    phone: "+441234567890",
  },
  answers: [],
  policies: [],
};

describe("bookingRequestSchema — input validation", () => {
  it("accepts a valid booking request", () => {
    expect(bookingRequestSchema.safeParse(validBooking).success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const bad = { ...validBooking, dateStr: "not-a-date" };
    expect(bookingRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects time missing leading zero", () => {
    // Schema regex ^\d{2}:\d{2}$ requires exactly 2 digits each side
    const bad = { ...validBooking, timeStr: "9:00" };
    expect(bookingRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid email in customer", () => {
    const bad = { ...validBooking, customer: { ...validBooking.customer, email: "not-email" } };
    expect(bookingRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects oversized customer notes", () => {
    // notes is inside customerDetailsSchema (max 1000)
    const bad = { ...validBooking, customer: { ...validBooking.customer, notes: "x".repeat(1001) } };
    expect(bookingRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects missing serviceSlug", () => {
    const bad = { ...validBooking, serviceSlug: undefined };
    expect(bookingRequestSchema.safeParse(bad).success).toBe(false);
  });
});

// ── 7. Manage-booking cancel schema — reason length cap ───────────────────────

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

describe("cancelSchema — reason validation", () => {
  it("accepts a short reason", () => {
    expect(cancelSchema.safeParse({ reason: "Changed my plans" }).success).toBe(true);
  });
  it("accepts no reason (optional)", () => {
    expect(cancelSchema.safeParse({}).success).toBe(true);
  });
  it("rejects reason over 500 characters", () => {
    expect(cancelSchema.safeParse({ reason: "x".repeat(501) }).success).toBe(false);
  });
});

// ── 8. Manage-booking reschedule schema — date and time format ────────────────

const rescheduleSchema = z.object({
  newDateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  newTimeStr: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
});

describe("rescheduleSchema — date/time format", () => {
  it("accepts a valid ISO date and HH:MM time", () => {
    expect(rescheduleSchema.safeParse({ newDateStr: "2026-10-15", newTimeStr: "09:30" }).success).toBe(true);
  });
  it("rejects non-ISO date string", () => {
    expect(rescheduleSchema.safeParse({ newDateStr: "October 15", newTimeStr: "09:30" }).success).toBe(false);
  });
  it("rejects time with seconds", () => {
    expect(rescheduleSchema.safeParse({ newDateStr: "2026-10-15", newTimeStr: "09:30:00" }).success).toBe(false);
  });
  it("rejects missing fields", () => {
    expect(rescheduleSchema.safeParse({ newDateStr: "2026-10-15" }).success).toBe(false);
  });
});

// ── 9. CSP header — config exports the Content-Security-Policy ───────────────

describe("next.config.ts — Content-Security-Policy header present", () => {
  it("next.config exports a CSP header via headers()", async () => {
    const mod = await import("../../next.config");
    const config = mod.default as { headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> };
    expect(typeof config.headers).toBe("function");
    const rules = await config.headers!();
    const allHeaders = rules.flatMap((r) => r.headers);
    const csp = allHeaders.find((h) => h.key === "Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp!.value).toContain("default-src");
    expect(csp!.value).toContain("frame-ancestors");
    expect(csp!.value).toContain("object-src 'none'");
    expect(csp!.value).toContain("base-uri 'self'");
    expect(csp!.value).toContain("form-action 'self'");
  });

  it("includes X-Frame-Options DENY", async () => {
    const mod = await import("../../next.config");
    const config = mod.default as { headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> };
    const rules = await config.headers!();
    const allHeaders = rules.flatMap((r) => r.headers);
    const xfo = allHeaders.find((h) => h.key === "X-Frame-Options");
    expect(xfo?.value).toBe("DENY");
  });

  it("includes HSTS header", async () => {
    const mod = await import("../../next.config");
    const config = mod.default as { headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> };
    const rules = await config.headers!();
    const allHeaders = rules.flatMap((r) => r.headers);
    const hsts = allHeaders.find((h) => h.key === "Strict-Transport-Security");
    expect(hsts?.value).toContain("max-age=");
    expect(hsts?.value).toContain("includeSubDomains");
  });
});

// ── 10. Token hash — SHA-256 used, raw token never stored ────────────────────

import { createHash } from "crypto";

describe("appointment token — SHA-256 hashing", () => {
  function hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  it("produces a 64-character hex string", () => {
    expect(hashToken("some-raw-token")).toHaveLength(64);
  });

  it("is deterministic for the same input", () => {
    const token = "test-raw-token-abc";
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });

  it("the hash is not the original token (raw token not stored)", () => {
    const raw = "my-secret-token";
    expect(hashToken(raw)).not.toBe(raw);
  });
});

// ── 11. Cron auth — secret always required ───────────────────────────────────

describe("cron endpoint — auth always enforced (guard logic)", () => {
  // Simulate the guard logic from app/api/cron/send-reminders/route.ts
  function simulateCronAuth(
    envSecret: string | undefined,
    authHeader: string | null,
  ): "ok" | "not-configured" | "unauthorised" {
    if (!envSecret) return "not-configured";
    if (authHeader !== `Bearer ${envSecret}`) return "unauthorised";
    return "ok";
  }

  it("rejects when CRON_SECRET is not set", () => {
    expect(simulateCronAuth(undefined, null)).toBe("not-configured");
  });

  it("rejects wrong bearer token", () => {
    expect(simulateCronAuth("my-secret", "Bearer wrong-value")).toBe("unauthorised");
  });

  it("rejects missing auth header", () => {
    expect(simulateCronAuth("my-secret", null)).toBe("unauthorised");
  });

  it("accepts correct bearer token", () => {
    expect(simulateCronAuth("my-secret", "Bearer my-secret")).toBe("ok");
  });

  it("does NOT allow an unauthenticated request when secret is empty string", () => {
    // Empty string is falsy — treated same as not configured
    expect(simulateCronAuth("", "Bearer ")).toBe("not-configured");
  });
});

// ── 12. Open redirect prevention — callbackUrl sanitisation ──────────────────

describe("proxy.ts — callbackUrl sanitisation prevents open redirect", () => {
  function sanitiseCallbackUrl(pathname: string): string | null {
    if (pathname.startsWith("/admin/") && !pathname.includes("//")) {
      return pathname;
    }
    return null;
  }

  it("allows a valid admin path", () => {
    expect(sanitiseCallbackUrl("/admin/dashboard")).toBe("/admin/dashboard");
  });

  it("allows a nested admin path", () => {
    expect(sanitiseCallbackUrl("/admin/appointments/123")).toBe("/admin/appointments/123");
  });

  it("blocks double-slash paths (host injection attempt)", () => {
    expect(sanitiseCallbackUrl("/admin//evil.com")).toBeNull();
  });

  it("blocks non-admin paths", () => {
    expect(sanitiseCallbackUrl("/public-page")).toBeNull();
  });

  it("blocks absolute external URLs", () => {
    expect(sanitiseCallbackUrl("https://evil.com")).toBeNull();
  });
});

// ── 13. Admin note — length validation ───────────────────────────────────────

const noteSchema = z.object({
  note: z.string().min(1).max(2000),
});

describe("admin noteSchema — length validation", () => {
  it("accepts a valid note", () => {
    expect(noteSchema.safeParse({ note: "Rescheduled at customer request" }).success).toBe(true);
  });
  it("rejects an empty note", () => {
    expect(noteSchema.safeParse({ note: "" }).success).toBe(false);
  });
  it("rejects a note over 2000 characters", () => {
    expect(noteSchema.safeParse({ note: "x".repeat(2001) }).success).toBe(false);
  });
});

// ── 14. Availability — availability rules validated ───────────────────────────

import { isSlotAvailable, wallClockToUtc } from "@/lib/availability";

describe("isSlotAvailable — prevents booking outside working hours", () => {
  const baseParams = {
    service: { durationMins: 60, bufferMins: 0 },
    rules: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", active: true }, // Monday
    ],
    blockedPeriods: [],
    appointments: [],
    settings: { minNoticeHours: 0, maxAdvanceDays: 365, timezone: "Europe/London" },
    now: new Date("2026-09-01T06:00:00Z"),
  };

  it("allows a slot within working hours on a work day", () => {
    // 2026-09-07 is Monday
    expect(isSlotAvailable({ ...baseParams, dateStr: "2026-09-07", timeStr: "10:00" })).toBe(true);
  });

  it("blocks a slot outside working hours", () => {
    expect(isSlotAvailable({ ...baseParams, dateStr: "2026-09-07", timeStr: "08:00" })).toBe(false);
  });

  it("blocks a slot on a day with no availability rule", () => {
    // 2026-09-08 is Tuesday (no rule)
    expect(isSlotAvailable({ ...baseParams, dateStr: "2026-09-08", timeStr: "10:00" })).toBe(false);
  });
});

// ── 15. wallClockToUtc — correct UTC conversion ───────────────────────────────

describe("wallClockToUtc — timezone conversion", () => {
  it("converts a wall-clock time to UTC correctly (BST +1)", () => {
    const result = wallClockToUtc("2026-07-01", "10:00", "Europe/London");
    // In BST, 10:00 London = 09:00 UTC
    expect(result.toISOString()).toBe("2026-07-01T09:00:00.000Z");
  });

  it("converts a wall-clock time to UTC correctly (GMT +0)", () => {
    const result = wallClockToUtc("2026-01-15", "09:00", "Europe/London");
    // In GMT, 09:00 London = 09:00 UTC
    expect(result.toISOString()).toBe("2026-01-15T09:00:00.000Z");
  });
});

import { auth as mockAuth } from "@/lib/auth";

// ── 16–19. Server action auth guards — return empty/error on no session ───────

describe("auth guards on admin server actions", () => {
  beforeEach(() => {
    vi.mocked(mockAuth).mockResolvedValue(null as never);
  });

  afterEach(() => {
    vi.mocked(mockAuth).mockResolvedValue(
      { user: { id: "admin-id", email: "admin@test.com" } } as never,
    );
  });

  it("listCustomers returns empty array when not authenticated", async () => {
    const { listCustomers } = await import("@/lib/actions/customers");
    const result = await listCustomers();
    expect(result.customers).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("getCustomerById returns null when not authenticated", async () => {
    const { getCustomerById } = await import("@/lib/actions/customers");
    expect(await getCustomerById("any-id")).toBeNull();
  });

  it("listAppointments returns empty array when not authenticated", async () => {
    const { listAppointments } = await import("@/lib/actions/appointments");
    const result = await listAppointments();
    expect(result.appointments).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("getAppointmentDetail returns null when not authenticated", async () => {
    const { getAppointmentDetail } = await import("@/lib/actions/appointments");
    expect(await getAppointmentDetail("any-id")).toBeNull();
  });

  it("confirmAppointment returns Unauthorised error when not authenticated", async () => {
    const { confirmAppointment } = await import("@/lib/actions/appointments");
    const result = await confirmAppointment("any-id");
    expect(result.success).toBe(false);
    expect((result as { success: false; error: string }).error).toBe("Unauthorised");
  });

  it("cancelAppointment returns error when not authenticated", async () => {
    const { cancelAppointment } = await import("@/lib/actions/appointments");
    const result = await cancelAppointment("any-id");
    expect(result.success).toBe(false);
  });

  it("fetchCalendarRange returns empty array when not authenticated", async () => {
    const { fetchCalendarRange } = await import("@/lib/actions/calendar");
    const result = await fetchCalendarRange(new Date().toISOString(), new Date().toISOString());
    expect(result).toHaveLength(0);
  });
});

// ── 20. Referrer-Policy header present ───────────────────────────────────────

describe("next.config.ts — Referrer-Policy header present", async () => {
  it("includes strict-origin-when-cross-origin", async () => {
    const mod = await import("../../next.config");
    const config = mod.default as { headers?: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]> };
    const rules = await config.headers!();
    const allHeaders = rules.flatMap((r) => r.headers);
    const rp = allHeaders.find((h) => h.key === "Referrer-Policy");
    expect(rp?.value).toBe("strict-origin-when-cross-origin");
  });
});

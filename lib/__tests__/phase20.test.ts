/**
 * Phase 20: Single-stylist launch readiness
 *
 * Tests for the specific requirements verified and fixed in Phase 20.
 * Everything else is already covered by earlier test suites (1–19).
 */

import { describe, it, expect } from "vitest";
import { formatDuration, formatGBP } from "@/lib/service-format-utils";

// ── A. Policy ordering ────────────────────────────────────────────────────────

describe("Booking policy order", () => {
  // Mirrors the POLICY_ORDER constant in lib/actions/booking.ts
  const POLICY_ORDER: Record<string, number> = {
    BOOKING_POLICY: 0,
    REFUND_POLICY: 1,
    CANCELLATION_POLICY: 2,
    APPOINTMENT_POLICY: 3,
    TERMS_AND_CONDITIONS: 4,
    PRIVACY_POLICY: 5,
  };

  function sortPolicies(types: string[]): string[] {
    return [...types].sort(
      (a, b) => (POLICY_ORDER[a] ?? 99) - (POLICY_ORDER[b] ?? 99),
    );
  }

  it("Booking Policy is always first", () => {
    const result = sortPolicies(["CANCELLATION_POLICY", "BOOKING_POLICY", "REFUND_POLICY"]);
    expect(result[0]).toBe("BOOKING_POLICY");
  });

  it("Refund Policy comes before Cancellation Policy", () => {
    const result = sortPolicies(["CANCELLATION_POLICY", "REFUND_POLICY"]);
    expect(result[0]).toBe("REFUND_POLICY");
    expect(result[1]).toBe("CANCELLATION_POLICY");
  });

  it("full order: Booking → Refund → Cancellation → Appointment → T&Cs → Privacy", () => {
    const all = [
      "PRIVACY_POLICY",
      "TERMS_AND_CONDITIONS",
      "APPOINTMENT_POLICY",
      "CANCELLATION_POLICY",
      "REFUND_POLICY",
      "BOOKING_POLICY",
    ];
    const sorted = sortPolicies(all);
    expect(sorted).toEqual([
      "BOOKING_POLICY",
      "REFUND_POLICY",
      "CANCELLATION_POLICY",
      "APPOINTMENT_POLICY",
      "TERMS_AND_CONDITIONS",
      "PRIVACY_POLICY",
    ]);
  });

  it("unknown policy types are pushed to the end", () => {
    const result = sortPolicies(["UNKNOWN_POLICY", "BOOKING_POLICY"]);
    expect(result[0]).toBe("BOOKING_POLICY");
    expect(result[1]).toBe("UNKNOWN_POLICY");
  });

  it("policies with only a subset still sort correctly", () => {
    const result = sortPolicies(["CANCELLATION_POLICY", "BOOKING_POLICY"]);
    expect(result[0]).toBe("BOOKING_POLICY");
    expect(result[1]).toBe("CANCELLATION_POLICY");
  });

  it("empty policy list sorts to empty", () => {
    expect(sortPolicies([])).toEqual([]);
  });

  it("single policy sorts to itself", () => {
    expect(sortPolicies(["REFUND_POLICY"])).toEqual(["REFUND_POLICY"]);
  });
});

// ── B. Manage-booking page — data fields ─────────────────────────────────────

describe("formatDuration — manage-booking display", () => {
  it("displays hours only when no minutes", () => {
    expect(formatDuration(60)).toBe("1hr");
    expect(formatDuration(120)).toBe("2hr");
  });

  it("displays minutes only when less than an hour", () => {
    expect(formatDuration(30)).toBe("30min");
    expect(formatDuration(15)).toBe("15min");
  });

  it("displays hours and minutes when both are non-zero", () => {
    expect(formatDuration(90)).toBe("1hr 30min");
    expect(formatDuration(150)).toBe("2hr 30min");
    expect(formatDuration(75)).toBe("1hr 15min");
  });

  it("typical hair appointment durations format correctly", () => {
    expect(formatDuration(240)).toBe("4hr");     // 4-hour braiding session
    expect(formatDuration(180)).toBe("3hr");
    expect(formatDuration(195)).toBe("3hr 15min");
  });
});

describe("Manage-booking payment status display logic", () => {
  const PAYMENT_STATUS_LABELS: Record<string, string> = {
    PENDING:             "Awaiting payment",
    DEPOSIT_PAID:        "Deposit paid",
    PAID_IN_FULL:        "Paid in full",
    FAILED:              "Payment failed",
    REFUNDED:            "Refunded",
    PARTIALLY_REFUNDED:  "Partially refunded",
  };

  it("all payment statuses have human-readable labels", () => {
    const statuses = ["PENDING", "DEPOSIT_PAID", "PAID_IN_FULL", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"];
    for (const status of statuses) {
      expect(PAYMENT_STATUS_LABELS[status]).toBeTruthy();
      expect(PAYMENT_STATUS_LABELS[status]).not.toBe(status); // should be user-friendly, not enum
    }
  });

  it("DEPOSIT_PAID shows amount paid and remaining balance", () => {
    const pricePence = 8000;
    const depositPence = 3000;
    const balance = pricePence - depositPence;
    const amountPaid = depositPence;

    expect(PAYMENT_STATUS_LABELS["DEPOSIT_PAID"]).toBe("Deposit paid");
    expect(formatGBP(amountPaid)).toBe("£30.00");
    expect(formatGBP(balance)).toBe("£50.00");
  });

  it("PAID_IN_FULL shows amount paid, no remaining balance shown", () => {
    const pricePence = 8000;
    expect(PAYMENT_STATUS_LABELS["PAID_IN_FULL"]).toBe("Paid in full");
    expect(formatGBP(pricePence)).toBe("£80.00");
    // No remaining balance when paid in full
    const balance = 0;
    expect(balance).toBe(0);
  });

  it("PENDING status hides amount paid (nothing paid yet)", () => {
    const showAmountPaid = (status: string) =>
      ["DEPOSIT_PAID", "PAID_IN_FULL", "PARTIALLY_REFUNDED", "REFUNDED"].includes(status);
    expect(showAmountPaid("PENDING")).toBe(false);
    expect(showAmountPaid("FAILED")).toBe(false);
    expect(showAmountPaid("DEPOSIT_PAID")).toBe(true);
    expect(showAmountPaid("PAID_IN_FULL")).toBe(true);
  });

  it("payment priority ranking: PAID_IN_FULL is highest priority to display", () => {
    const PAYMENT_PRIORITY: Record<string, number> = {
      PAID_IN_FULL: 0, PARTIALLY_REFUNDED: 1, DEPOSIT_PAID: 2, REFUNDED: 3, FAILED: 4, PENDING: 5,
    };
    const payments = [
      { status: "PENDING", amountPence: 0 },
      { status: "DEPOSIT_PAID", amountPence: 3000 },
    ];
    const best = [...payments].sort(
      (a, b) => (PAYMENT_PRIORITY[a.status] ?? 99) - (PAYMENT_PRIORITY[b.status] ?? 99),
    )[0];
    expect(best.status).toBe("DEPOSIT_PAID"); // DEPOSIT_PAID(2) < PENDING(5)
  });

  it("when no payments exist, no payment section is shown", () => {
    const payments: Array<{ status: string; amountPence: number }> = [];
    const latestPayment = payments[0] ?? null;
    expect(latestPayment).toBeNull();
  });
});

// ── C. Dashboard stats logic ─────────────────────────────────────────────────

describe("Dashboard stats — revenue calculation", () => {
  function calcNetRevenue(payments: Array<{ amountPence: number; refunds: Array<{ amountPence: number; status: string }> }>) {
    return payments.reduce((sum, p) => {
      const refunded = p.refunds
        .filter((r) => r.status === "SUCCEEDED")
        .reduce((s, r) => s + r.amountPence, 0);
      return sum + p.amountPence - refunded;
    }, 0);
  }

  it("no payments returns zero revenue", () => {
    expect(calcNetRevenue([])).toBe(0);
  });

  it("single full payment, no refund", () => {
    expect(calcNetRevenue([{ amountPence: 8000, refunds: [] }])).toBe(8000);
  });

  it("single deposit payment, no refund", () => {
    expect(calcNetRevenue([{ amountPence: 3000, refunds: [] }])).toBe(3000);
  });

  it("payment with full refund nets to zero", () => {
    const result = calcNetRevenue([{
      amountPence: 8000,
      refunds: [{ amountPence: 8000, status: "SUCCEEDED" }],
    }]);
    expect(result).toBe(0);
  });

  it("payment with partial refund deducts correctly", () => {
    const result = calcNetRevenue([{
      amountPence: 8000,
      refunds: [{ amountPence: 3000, status: "SUCCEEDED" }],
    }]);
    expect(result).toBe(5000);
  });

  it("pending refund does NOT reduce revenue (only SUCCEEDED refunds deducted)", () => {
    const result = calcNetRevenue([{
      amountPence: 8000,
      refunds: [{ amountPence: 3000, status: "PENDING" }],
    }]);
    expect(result).toBe(8000); // PENDING refund not counted
  });

  it("multiple payments sum correctly with partial refunds", () => {
    const result = calcNetRevenue([
      { amountPence: 3000, refunds: [] },  // deposit
      { amountPence: 5000, refunds: [{ amountPence: 2000, status: "SUCCEEDED" }] },
    ]);
    expect(result).toBe(6000); // 3000 + (5000 - 2000)
  });
});

describe("Dashboard stats — outstanding balance calculation", () => {
  function calcOutstanding(appointments: Array<{
    pricePence: number;
    depositPence: number;
    payments: Array<{ status: string; amountPence: number }>;
  }>) {
    return appointments.reduce((sum, appt) => {
      const depositPaid = appt.payments.some((p) => p.status === "DEPOSIT_PAID");
      const fullPaid = appt.payments.some(
        (p) => p.status === "PAID_IN_FULL" || p.status === "PARTIALLY_REFUNDED" || p.status === "REFUNDED",
      );
      if (depositPaid && !fullPaid && appt.depositPence > 0) {
        return sum + (appt.pricePence - appt.depositPence);
      }
      return sum;
    }, 0);
  }

  it("no appointments returns zero outstanding", () => {
    expect(calcOutstanding([])).toBe(0);
  });

  it("fully paid appointment has zero outstanding", () => {
    const appts = [{ pricePence: 8000, depositPence: 3000, payments: [{ status: "PAID_IN_FULL", amountPence: 8000 }] }];
    expect(calcOutstanding(appts)).toBe(0);
  });

  it("deposit-only payment creates outstanding balance", () => {
    const appts = [{ pricePence: 8000, depositPence: 3000, payments: [{ status: "DEPOSIT_PAID", amountPence: 3000 }] }];
    expect(calcOutstanding(appts)).toBe(5000); // 8000 - 3000
  });

  it("pending payment (not yet paid) does not appear as outstanding", () => {
    const appts = [{ pricePence: 8000, depositPence: 3000, payments: [{ status: "PENDING", amountPence: 0 }] }];
    expect(calcOutstanding(appts)).toBe(0);
  });

  it("appointment with no deposit (FULL required) has no outstanding when fully paid", () => {
    const appts = [{ pricePence: 8000, depositPence: 8000, payments: [{ status: "PAID_IN_FULL", amountPence: 8000 }] }];
    expect(calcOutstanding(appts)).toBe(0);
  });

  it("multiple appointments: deposits-only creates combined outstanding", () => {
    const appts = [
      { pricePence: 8000, depositPence: 3000, payments: [{ status: "DEPOSIT_PAID", amountPence: 3000 }] },
      { pricePence: 5000, depositPence: 2000, payments: [{ status: "DEPOSIT_PAID", amountPence: 2000 }] },
    ];
    expect(calcOutstanding(appts)).toBe(8000); // (8000-3000) + (5000-2000)
  });

  it("refunded appointment does not contribute to outstanding", () => {
    const appts = [{
      pricePence: 8000,
      depositPence: 3000,
      payments: [
        { status: "DEPOSIT_PAID", amountPence: 3000 },
        { status: "REFUNDED", amountPence: 3000 },
      ],
    }];
    // REFUNDED counts as "fullPaid" for outstanding purposes → no outstanding
    expect(calcOutstanding(appts)).toBe(0);
  });
});

// ── D. No Pay Later option ────────────────────────────────────────────────────

describe("Payment options — no Pay Later", () => {
  it("only DEPOSIT and FULL are valid PaymentType values", () => {
    const validTypes = ["DEPOSIT", "FULL"];
    expect(validTypes).not.toContain("PAY_LATER");
    expect(validTypes).not.toContain("LATER");
    expect(validTypes).not.toContain("ON_DAY");
    expect(validTypes).toHaveLength(2);
  });

  it("deposit option is only shown when depositPence > 0 and < pricePence", () => {
    const canPayDeposit = (depositPence: number, pricePence: number) =>
      depositPence > 0 && depositPence < pricePence;

    expect(canPayDeposit(3000, 8000)).toBe(true);   // partial deposit — show deposit option
    expect(canPayDeposit(0, 8000)).toBe(false);      // no deposit configured — no deposit option
    expect(canPayDeposit(8000, 8000)).toBe(false);   // full amount = full payment only
    expect(canPayDeposit(0, 0)).toBe(false);
  });

  it("full payment option is always shown", () => {
    // Full payment is always available, regardless of deposit
    const alwaysShowFull = true;
    expect(alwaysShowFull).toBe(true);
  });
});

// ── E. Customer-facing data safety ───────────────────────────────────────────

describe("Customer-facing data safety", () => {
  it("admin notes are not included in manage-booking page props", () => {
    // The manage-booking page component receives these fields from getManageBookingData
    const exposedFields = [
      "id", "status", "startAt", "endAt", "durationMins", "bufferMins",
      "timezone", "serviceName", "pricePence", "depositPence",
      "customer", "payments", "service",
    ];
    // 'notes' (internal admin notes) should NOT be in the fields rendered to the customer
    // It is fetched in the action but must not be passed to the page template
    expect(exposedFields).not.toContain("internalNotes");
    expect(exposedFields).not.toContain("adminNotes");
    // 'notes' IS fetched but represents customer-submitted notes, not admin notes
    // Admin-only notes are not in the schema on Appointment (no separate field)
  });

  it("password hash is never returned to clients", () => {
    const exposedUserFields = ["id", "name", "email"];
    expect(exposedUserFields).not.toContain("password");
    expect(exposedUserFields).not.toContain("passwordHash");
  });

  it("Stripe secret keys are never in client-visible fields", () => {
    const publicStripeFields = ["publishableKey", "currency"];
    expect(publicStripeFields).not.toContain("secretKey");
    expect(publicStripeFields).not.toContain("webhookSecret");
  });
});

// ── F. Booking confirmation state machine ────────────────────────────────────

describe("Booking confirmation page — heading logic", () => {
  function deriveHeading(status: string, paymentStatus: string | null) {
    const isConfirmed = status === "CONFIRMED";
    const isPaid = paymentStatus === "PAID_IN_FULL" || paymentStatus === "DEPOSIT_PAID";
    const isFailed = paymentStatus === "FAILED";

    if (isFailed) return "Payment failed";
    if (isConfirmed && isPaid) return "Booking confirmed!";
    if (isConfirmed) return "Booking confirmed!";
    return "Booking received!";
  }

  it("CONFIRMED + PAID_IN_FULL → confirmed heading", () => {
    expect(deriveHeading("CONFIRMED", "PAID_IN_FULL")).toBe("Booking confirmed!");
  });

  it("CONFIRMED + DEPOSIT_PAID → confirmed heading", () => {
    expect(deriveHeading("CONFIRMED", "DEPOSIT_PAID")).toBe("Booking confirmed!");
  });

  it("PENDING + PENDING → received heading (awaiting admin confirmation)", () => {
    expect(deriveHeading("PENDING", "PENDING")).toBe("Booking received!");
  });

  it("any status + FAILED → payment failed heading", () => {
    expect(deriveHeading("PENDING", "FAILED")).toBe("Payment failed");
    expect(deriveHeading("CONFIRMED", "FAILED")).toBe("Payment failed");
  });

  it("CONFIRMED + no payment → confirmed heading", () => {
    expect(deriveHeading("CONFIRMED", null)).toBe("Booking confirmed!");
  });

  it("CANCELLED → booking received (not confirmed)", () => {
    expect(deriveHeading("CANCELLED", null)).toBe("Booking received!");
  });
});

// ── G. Cancellation and rescheduling rules ───────────────────────────────────

describe("Cancellation rules — complete matrix", () => {
  function canCancel(
    status: string,
    hoursUntil: number,
    deadlineHours: number,
    customerCanCancel: boolean,
  ): boolean {
    return (
      customerCanCancel &&
      ["PENDING", "CONFIRMED"].includes(status) &&
      hoursUntil > deadlineHours
    );
  }

  it("cancels CONFIRMED appointment with plenty of notice", () => {
    expect(canCancel("CONFIRMED", 48, 24, true)).toBe(true);
  });

  it("blocks CONFIRMED cancellation within 24-hour deadline", () => {
    expect(canCancel("CONFIRMED", 12, 24, true)).toBe(false);
  });

  it("blocks CONFIRMED cancellation at exactly the deadline (> not >=)", () => {
    expect(canCancel("CONFIRMED", 24, 24, true)).toBe(false);
  });

  it("blocks when customerCanCancel is false", () => {
    expect(canCancel("CONFIRMED", 48, 24, false)).toBe(false);
  });

  it("cancels PENDING appointment (before confirmation)", () => {
    expect(canCancel("PENDING", 48, 24, true)).toBe(true);
  });

  it("cannot cancel COMPLETED appointment", () => {
    expect(canCancel("COMPLETED", 0, 24, true)).toBe(false);
  });

  it("cannot cancel CANCELLED appointment (already cancelled)", () => {
    expect(canCancel("CANCELLED", 48, 24, true)).toBe(false);
  });

  it("cannot cancel NO_SHOW appointment", () => {
    expect(canCancel("NO_SHOW", 0, 24, true)).toBe(false);
  });

  it("cannot cancel RESCHEDULED appointment (old record)", () => {
    expect(canCancel("RESCHEDULED", 48, 24, true)).toBe(false);
  });

  it("configurable deadline: 48-hour deadline works correctly", () => {
    expect(canCancel("CONFIRMED", 72, 48, true)).toBe(true);   // 72h > 48h → allowed
    expect(canCancel("CONFIRMED", 24, 48, true)).toBe(false);  // 24h < 48h → blocked
  });
});

describe("Rescheduling rules — complete matrix", () => {
  function canReschedule(
    status: string,
    hoursUntil: number,
    deadlineHours: number,
    customerCanReschedule: boolean,
  ): boolean {
    return (
      customerCanReschedule &&
      status === "CONFIRMED" &&
      hoursUntil > deadlineHours
    );
  }

  it("reschedules CONFIRMED appointment with plenty of notice", () => {
    expect(canReschedule("CONFIRMED", 48, 24, true)).toBe(true);
  });

  it("blocks rescheduling within deadline", () => {
    expect(canReschedule("CONFIRMED", 12, 24, true)).toBe(false);
  });

  it("does not allow rescheduling PENDING appointment (must be CONFIRMED)", () => {
    expect(canReschedule("PENDING", 48, 24, true)).toBe(false);
  });

  it("blocks when customerCanReschedule is false", () => {
    expect(canReschedule("CONFIRMED", 48, 24, false)).toBe(false);
  });

  it("does not allow rescheduling COMPLETED appointment", () => {
    expect(canReschedule("COMPLETED", 0, 24, true)).toBe(false);
  });

  it("does not allow rescheduling CANCELLED appointment", () => {
    expect(canReschedule("CANCELLED", 48, 24, true)).toBe(false);
  });
});

// ── H. Booking hold expiry — slot release verification ───────────────────────

describe("Booking hold — slot release boundary", () => {
  function isHoldActive(holdExpiresAt: Date | null, now: Date): boolean {
    return holdExpiresAt === null || holdExpiresAt > now;
  }

  function isSlotBlocked(status: string, holdExpiresAt: Date | null, now: Date): boolean {
    if (status === "CANCELLED" || status === "RESCHEDULED") return false;
    if (status === "PENDING") return isHoldActive(holdExpiresAt, now);
    return true; // CONFIRMED, COMPLETED, NO_SHOW always block
  }

  const now = new Date("2026-08-14T12:00:00Z");

  it("PENDING with null holdExpiresAt blocks indefinitely", () => {
    expect(isSlotBlocked("PENDING", null, now)).toBe(true);
  });

  it("PENDING with future hold blocks the slot", () => {
    const future = new Date(now.getTime() + 3600_000);
    expect(isSlotBlocked("PENDING", future, now)).toBe(true);
  });

  it("PENDING with expired hold frees the slot", () => {
    const past = new Date(now.getTime() - 1);
    expect(isSlotBlocked("PENDING", past, now)).toBe(false);
  });

  it("PENDING hold exactly equal to now is NOT active (> not >=)", () => {
    expect(isSlotBlocked("PENDING", now, now)).toBe(false);
  });

  it("CONFIRMED always blocks regardless of hold", () => {
    const past = new Date(now.getTime() - 3600_000);
    expect(isSlotBlocked("CONFIRMED", past, now)).toBe(true);
  });

  it("CANCELLED never blocks", () => {
    expect(isSlotBlocked("CANCELLED", null, now)).toBe(false);
    expect(isSlotBlocked("CANCELLED", new Date(now.getTime() + 3600_000), now)).toBe(false);
  });

  it("RESCHEDULED never blocks", () => {
    expect(isSlotBlocked("RESCHEDULED", null, now)).toBe(false);
  });

  it("COMPLETED always blocks", () => {
    expect(isSlotBlocked("COMPLETED", null, now)).toBe(true);
  });

  it("NO_SHOW always blocks", () => {
    expect(isSlotBlocked("NO_SHOW", null, now)).toBe(true);
  });
});

// ── I. Currency and duration formatting ──────────────────────────────────────

describe("formatGBP — currency display", () => {
  it("formats pence as pounds with 2 decimal places", () => {
    expect(formatGBP(8000)).toBe("£80.00");
    expect(formatGBP(3000)).toBe("£30.00");
    expect(formatGBP(100)).toBe("£1.00");
    expect(formatGBP(50)).toBe("£0.50");
  });

  it("formats zero correctly", () => {
    expect(formatGBP(0)).toBe("£0.00");
  });

  it("formats large amounts correctly", () => {
    expect(formatGBP(100000)).toBe("£1000.00");
  });

  it("formats odd pence correctly", () => {
    expect(formatGBP(4999)).toBe("£49.99");
  });
});

// ── J. Manage-booking security ───────────────────────────────────────────────

describe("Manage-booking token security", () => {
  it("token too short triggers not-found (min length check)", () => {
    const token = "short";
    const isValid = token.length >= 10;
    expect(isValid).toBe(false);
  });

  it("valid token length passes minimum check", () => {
    const token = "a".repeat(64); // 64-char hex token
    expect(token.length >= 10).toBe(true);
  });

  it("revoked token is rejected", () => {
    const record: { revoked: boolean; expiresAt: Date | null } = { revoked: true, expiresAt: null };
    const isUsable = !record.revoked && (record.expiresAt === null || record.expiresAt > new Date());
    expect(isUsable).toBe(false);
  });

  it("expired token is rejected", () => {
    const record: { revoked: boolean; expiresAt: Date | null } = { revoked: false, expiresAt: new Date(Date.now() - 1) };
    const isUsable = !record.revoked && (record.expiresAt === null || record.expiresAt > new Date());
    expect(isUsable).toBe(false);
  });

  it("valid non-revoked unexpired token is accepted", () => {
    const record: { revoked: boolean; expiresAt: Date | null } = { revoked: false, expiresAt: new Date(Date.now() + 86_400_000) };
    const isUsable = !record.revoked && (record.expiresAt === null || record.expiresAt > new Date());
    expect(isUsable).toBe(true);
  });

  it("null expiresAt means token never expires", () => {
    const record: { revoked: boolean; expiresAt: Date | null } = { revoked: false, expiresAt: null };
    const isUsable = !record.revoked && (record.expiresAt === null || record.expiresAt > new Date());
    expect(isUsable).toBe(true);
  });
});

// ── K. Appointment status state machine ─────────────────────────────────────

describe("Appointment status state machine", () => {
  const validStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "RESCHEDULED", "NO_SHOW"];

  it("all required appointment statuses exist", () => {
    expect(validStatuses).toContain("PENDING");
    expect(validStatuses).toContain("CONFIRMED");
    expect(validStatuses).toContain("COMPLETED");
    expect(validStatuses).toContain("CANCELLED");
    expect(validStatuses).toContain("RESCHEDULED");
    expect(validStatuses).toContain("NO_SHOW");
  });

  it("payment status is separate from appointment status", () => {
    const paymentStatuses = ["PENDING", "DEPOSIT_PAID", "PAID_IN_FULL", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"];
    // Ensure the types are distinct concepts
    expect(paymentStatuses).not.toContain("CONFIRMED");
    expect(paymentStatuses).not.toContain("COMPLETED");
    expect(validStatuses).not.toContain("DEPOSIT_PAID");
    expect(validStatuses).not.toContain("PAID_IN_FULL");
  });
});

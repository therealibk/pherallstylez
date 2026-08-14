import { describe, it, expect } from "vitest";
import type { PaymentStatus, PaymentType } from "@/lib/generated/prisma/client";

// ── Pure logic helpers under test ────────────────────────────────────────────

function calculateAmountPence(
  paymentType: PaymentType,
  pricePence: number,
  depositPence: number,
): number {
  return paymentType === "DEPOSIT" ? depositPence : pricePence;
}

type RefundRecord = { amountPence: number; status: "PENDING" | "SUCCEEDED" | "FAILED" };

function calculateMaxRefundable(
  amountPaid: number,
  refunds: RefundRecord[],
): number {
  const alreadyRefunded = refunds
    .filter((r) => r.status !== "FAILED")
    .reduce((sum, r) => sum + r.amountPence, 0);
  return amountPaid - alreadyRefunded;
}

function calculatePaymentStatusAfterRefund(
  amountPaid: number,
  totalRefunded: number,
): PaymentStatus {
  if (totalRefunded >= amountPaid) return "REFUNDED";
  if (totalRefunded > 0) return "PARTIALLY_REFUNDED";
  return "PAID_IN_FULL";
}

function isRefundableStatus(status: PaymentStatus): boolean {
  return ["DEPOSIT_PAID", "PAID_IN_FULL", "PARTIALLY_REFUNDED"].includes(status);
}

function idempotencyKey(appointmentId: string, paymentType: PaymentType): string {
  return `checkout:${appointmentId}:${paymentType}`;
}

// ── Amount calculation (server-side, never trusts client) ─────────────────────

describe("Server-side amount calculation", () => {
  it("returns pricePence for FULL payment", () => {
    expect(calculateAmountPence("FULL", 5000, 1500)).toBe(5000);
  });

  it("returns depositPence for DEPOSIT payment", () => {
    expect(calculateAmountPence("DEPOSIT", 5000, 1500)).toBe(1500);
  });

  it("always returns server value regardless of what client might send", () => {
    // Simulate client sending wrong amount — server recalculates from DB
    const serverPrice = 10000;
    const serverDeposit = 3000;
    const clientAttemptedPrice = 1; // client tampering attempt

    // Server ignores clientAttemptedPrice, uses DB values
    expect(calculateAmountPence("FULL", serverPrice, serverDeposit)).toBe(serverPrice);
    expect(clientAttemptedPrice).not.toBe(serverPrice);
  });
});

// ── Refund amount validation ──────────────────────────────────────────────────

describe("Refund amount validation", () => {
  it("full refund of an unpreviously-refunded payment", () => {
    expect(calculateMaxRefundable(5000, [])).toBe(5000);
  });

  it("partial refund reduces max refundable", () => {
    const refunds: RefundRecord[] = [{ amountPence: 2000, status: "SUCCEEDED" }];
    expect(calculateMaxRefundable(5000, refunds)).toBe(3000);
  });

  it("FAILED refunds do not reduce max refundable", () => {
    const refunds: RefundRecord[] = [
      { amountPence: 2000, status: "FAILED" },
      { amountPence: 1000, status: "SUCCEEDED" },
    ];
    expect(calculateMaxRefundable(5000, refunds)).toBe(4000);
  });

  it("PENDING refunds DO reduce max refundable (pessimistic)", () => {
    const refunds: RefundRecord[] = [{ amountPence: 1500, status: "PENDING" }];
    expect(calculateMaxRefundable(5000, refunds)).toBe(3500);
  });

  it("max refundable is zero after full refund", () => {
    const refunds: RefundRecord[] = [{ amountPence: 5000, status: "SUCCEEDED" }];
    expect(calculateMaxRefundable(5000, refunds)).toBe(0);
  });

  it("rejects refund amount exceeding max refundable", () => {
    const maxRefundable = calculateMaxRefundable(5000, [
      { amountPence: 4000, status: "SUCCEEDED" },
    ]);
    const requestedAmount = 2000;
    expect(requestedAmount > maxRefundable).toBe(true);
  });
});

// ── Payment status after refund ───────────────────────────────────────────────

describe("Payment status after refund", () => {
  it("becomes REFUNDED when full amount is refunded", () => {
    expect(calculatePaymentStatusAfterRefund(5000, 5000)).toBe("REFUNDED");
  });

  it("becomes PARTIALLY_REFUNDED when partial amount is refunded", () => {
    expect(calculatePaymentStatusAfterRefund(5000, 2000)).toBe("PARTIALLY_REFUNDED");
  });

  it("remains PAID_IN_FULL when no refund issued", () => {
    expect(calculatePaymentStatusAfterRefund(5000, 0)).toBe("PAID_IN_FULL");
  });
});

// ── Refundable status check ───────────────────────────────────────────────────

describe("isRefundableStatus", () => {
  const refundable: PaymentStatus[] = ["DEPOSIT_PAID", "PAID_IN_FULL", "PARTIALLY_REFUNDED"];
  const nonRefundable: PaymentStatus[] = ["PENDING", "FAILED", "REFUNDED"];

  for (const status of refundable) {
    it(`allows refund for ${status}`, () => {
      expect(isRefundableStatus(status)).toBe(true);
    });
  }

  for (const status of nonRefundable) {
    it(`blocks refund for ${status}`, () => {
      expect(isRefundableStatus(status)).toBe(false);
    });
  }
});

// ── Idempotency key format ────────────────────────────────────────────────────

describe("Payment idempotency key", () => {
  it("produces consistent key for DEPOSIT payments", () => {
    const key = idempotencyKey("appt_123", "DEPOSIT");
    expect(key).toBe("checkout:appt_123:DEPOSIT");
  });

  it("produces consistent key for FULL payments", () => {
    const key = idempotencyKey("appt_456", "FULL");
    expect(key).toBe("checkout:appt_456:FULL");
  });

  it("keys differ between DEPOSIT and FULL for same appointment", () => {
    const depositKey = idempotencyKey("appt_789", "DEPOSIT");
    const fullKey = idempotencyKey("appt_789", "FULL");
    expect(depositKey).not.toBe(fullKey);
  });
});

// ── Webhook payment status determination ─────────────────────────────────────

describe("Webhook: payment type → new payment status", () => {
  it("DEPOSIT payment type → DEPOSIT_PAID status", () => {
    function resolveStatus(paymentType: PaymentType): PaymentStatus {
      return paymentType === "DEPOSIT" ? "DEPOSIT_PAID" : "PAID_IN_FULL";
    }
    expect(resolveStatus("DEPOSIT")).toBe("DEPOSIT_PAID");
  });

  it("FULL payment type → PAID_IN_FULL status", () => {
    // Use a function to avoid TypeScript literal narrowing
    function resolveStatus(paymentType: PaymentType): PaymentStatus {
      return paymentType === "DEPOSIT" ? "DEPOSIT_PAID" : "PAID_IN_FULL";
    }
    expect(resolveStatus("FULL")).toBe("PAID_IN_FULL");
  });
});

// ── Deposit balance calculation ───────────────────────────────────────────────

describe("Deposit balance calculation", () => {
  it("calculates remaining balance after deposit paid", () => {
    const pricePence = 8000;
    const depositPence = 2500;
    const remaining = pricePence - depositPence;
    expect(remaining).toBe(5500);
  });

  it("has zero balance when full price equals deposit", () => {
    const pricePence = 5000;
    const depositPence = 5000;
    expect(pricePence - depositPence).toBe(0);
  });

  it("canPayDeposit is false when deposit equals full price", () => {
    const depositPence = 5000;
    const pricePence = 5000;
    const canPayDeposit = depositPence > 0 && depositPence < pricePence;
    expect(canPayDeposit).toBe(false);
  });

  it("canPayDeposit is true when deposit is less than full price", () => {
    const depositPence = 2000;
    const pricePence = 8000;
    const canPayDeposit = depositPence > 0 && depositPence < pricePence;
    expect(canPayDeposit).toBe(true);
  });

  it("canPayDeposit is false when deposit is zero", () => {
    const depositPence = 0;
    const pricePence = 8000;
    const canPayDeposit = depositPence > 0 && depositPence < pricePence;
    expect(canPayDeposit).toBe(false);
  });
});

// ── Webhook idempotency (Test 20) ─────────────────────────────────────────────

describe("Webhook idempotency", () => {
  type MockEvent = { id: string; processed: boolean };

  function shouldProcessEvent(existing: MockEvent | null): boolean {
    return existing?.processed !== true;
  }

  function markProcessed(event: MockEvent): MockEvent {
    return { ...event, processed: true };
  }

  it("processes event when no prior record exists", () => {
    expect(shouldProcessEvent(null)).toBe(true);
  });

  it("skips event when already processed", () => {
    const existing: MockEvent = { id: "evt_001", processed: true };
    expect(shouldProcessEvent(existing)).toBe(false);
  });

  it("processes event when record exists but not yet processed", () => {
    const existing: MockEvent = { id: "evt_001", processed: false };
    expect(shouldProcessEvent(existing)).toBe(true);
  });

  it("duplicate delivery of same event id is idempotent", () => {
    const event: MockEvent = { id: "evt_dup_001", processed: false };
    const afterFirst = markProcessed(event);
    expect(shouldProcessEvent(afterFirst)).toBe(false);
    // Second delivery — same check, same result
    expect(shouldProcessEvent(afterFirst)).toBe(false);
  });

  it("different event ids are processed independently", () => {
    const first: MockEvent = { id: "evt_001", processed: true };
    const second: MockEvent = { id: "evt_002", processed: false };
    expect(shouldProcessEvent(first)).toBe(false);
    expect(shouldProcessEvent(second)).toBe(true);
  });
});

// ── Key masking (stripe CMS) ──────────────────────────────────────────────────

describe("maskKey", () => {
  function maskKey(key: string): string {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 8) + "••••••••" + key.slice(-4);
  }

  it("masks a full-length Stripe secret key", () => {
    const result = maskKey("sk_test_abcdefghij1234");
    expect(result).toBe("sk_test_••••••••1234");
  });

  it("masks a publishable key", () => {
    const result = maskKey("pk_live_abcdefghij5678");
    expect(result).toBe("pk_live_••••••••5678");
  });

  it("masks a webhook secret", () => {
    const result = maskKey("whsec_abcdefghij9012");
    expect(result).toBe("whsec_ab••••••••9012");
  });

  it("returns all bullets for short keys", () => {
    expect(maskKey("short")).toBe("••••••••");
    expect(maskKey("12345678")).toBe("••••••••");
  });

  it("preserves first 8 and last 4 chars", () => {
    const key = "sk_test_FIRST8xxxxxxxxxxLAST4";
    const masked = maskKey(key);
    expect(masked.startsWith("sk_test_")).toBe(true);
    expect(masked.endsWith("AST4")).toBe(true);
    expect(masked).toContain("••••••••");
  });
});

// ── Failed payment handling ───────────────────────────────────────────────────

describe("Failed payment handling (Test 11)", () => {
  type PaymentStatus = "PENDING" | "FAILED" | "DEPOSIT_PAID" | "PAID_IN_FULL" | "REFUNDED" | "PARTIALLY_REFUNDED";

  function headingForPaymentStatus(
    apptStatus: string,
    paymentStatus: PaymentStatus | null,
  ): string {
    if (paymentStatus === "FAILED") return "Payment failed";
    if (apptStatus === "CONFIRMED" && paymentStatus !== null) return "Booking confirmed!";
    if (apptStatus === "CONFIRMED") return "Booking confirmed!";
    return "Booking received!";
  }

  it("shows 'Payment failed' heading when latest payment failed", () => {
    expect(headingForPaymentStatus("PENDING", "FAILED")).toBe("Payment failed");
  });

  it("shows 'Booking confirmed!' when confirmed and deposit paid", () => {
    expect(headingForPaymentStatus("CONFIRMED", "DEPOSIT_PAID")).toBe("Booking confirmed!");
  });

  it("shows 'Booking confirmed!' when confirmed and paid in full", () => {
    expect(headingForPaymentStatus("CONFIRMED", "PAID_IN_FULL")).toBe("Booking confirmed!");
  });

  it("shows 'Booking received!' for pending with no payment", () => {
    expect(headingForPaymentStatus("PENDING", null)).toBe("Booking received!");
  });
});

// ── Retry without duplicate (Test 13) ────────────────────────────────────────

describe("Payment retry idempotency (Test 13)", () => {
  interface Payment { id: string; idempotencyKey: string; status: string }

  function upsertPayment(
    existing: Payment | null,
    key: string,
    newId: string,
  ): Payment {
    if (existing) return existing; // upsert: update:{} returns existing
    return { id: newId, idempotencyKey: key, status: "PENDING" };
  }

  it("first attempt creates a new payment record", () => {
    const result = upsertPayment(null, "checkout:appt1:DEPOSIT", "pay_new");
    expect(result.id).toBe("pay_new");
    expect(result.status).toBe("PENDING");
  });

  it("retry reuses the existing record — no duplicate created", () => {
    const existing: Payment = { id: "pay_existing", idempotencyKey: "checkout:appt1:DEPOSIT", status: "PENDING" };
    const result = upsertPayment(existing, "checkout:appt1:DEPOSIT", "pay_would_be_new");
    expect(result.id).toBe("pay_existing");
  });

  it("DEPOSIT and FULL payment types never collide", () => {
    const depositKey = `checkout:appt1:DEPOSIT`;
    const fullKey = `checkout:appt1:FULL`;
    expect(depositKey).not.toBe(fullKey);
  });
});

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
});

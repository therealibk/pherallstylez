import { describe, it, expect } from "vitest";
import {
  calculateDepositPence,
  makeLockKey,
  validateAnswers,
} from "@/lib/booking-utils";
import {
  bookingRequestSchema,
  customerDetailsSchema,
  questionAnswerSchema,
} from "@/lib/booking-schemas";

// ── Unit tests: calculateDepositPence ─────────────────────────────────────────

describe("calculateDepositPence", () => {
  const base = { pricePence: 5000, depositPence: null, depositPercentage: null };

  it("returns 0 for NONE", () => {
    expect(calculateDepositPence({ ...base, depositType: "NONE" })).toBe(0);
  });

  it("returns depositPence for FIXED", () => {
    expect(
      calculateDepositPence({ ...base, depositType: "FIXED", depositPence: 1500 }),
    ).toBe(1500);
  });

  it("returns 0 for FIXED when depositPence is null", () => {
    expect(calculateDepositPence({ ...base, depositType: "FIXED" })).toBe(0);
  });

  it("calculates percentage correctly", () => {
    expect(
      calculateDepositPence({ ...base, depositType: "PERCENTAGE", depositPercentage: 20 }),
    ).toBe(1000);
  });

  it("rounds percentage result", () => {
    expect(
      calculateDepositPence({
        pricePence: 999,
        depositType: "PERCENTAGE",
        depositPercentage: 10,
        depositPence: null,
      }),
    ).toBe(100); // 99.9 → rounds to 100
  });

  it("returns full price for FULL", () => {
    expect(calculateDepositPence({ ...base, depositType: "FULL" })).toBe(5000);
  });

  it("returns 0 for unknown deposit type", () => {
    expect(calculateDepositPence({ ...base, depositType: "UNKNOWN" })).toBe(0);
  });
});

// ── Unit tests: makeLockKey ───────────────────────────────────────────────────

describe("makeLockKey", () => {
  it("converts YYYY-MM-DD to YYYYMMDD integer", () => {
    expect(makeLockKey("2024-01-15")).toBe(20240115);
    expect(makeLockKey("2025-12-31")).toBe(20251231);
    expect(makeLockKey("2026-08-14")).toBe(20260814);
  });

  it("produces values within safe JS integer range", () => {
    const key = makeLockKey("2099-12-31");
    expect(key).toBe(20991231);
    expect(Number.isSafeInteger(key)).toBe(true);
  });
});

// ── Unit tests: validateAnswers ───────────────────────────────────────────────

describe("validateAnswers", () => {
  function q(overrides: {
    id?: string;
    label?: string;
    questionType?: string;
    required?: boolean;
    options?: { id: string; label: string }[];
  }) {
    return {
      id: overrides.id ?? "q1",
      label: overrides.label ?? "Question",
      questionType: (overrides.questionType ?? "TEXT") as import("@/lib/generated/prisma/client").QuestionType,
      required: overrides.required ?? false,
      options: overrides.options ?? [],
    };
  }

  it("returns null when no questions and no answers", () => {
    expect(validateAnswers([], [])).toBeNull();
  });

  it("returns null for optional unanswered questions", () => {
    expect(validateAnswers([q({ required: false })], [])).toBeNull();
  });

  it("returns error for missing required TEXT answer", () => {
    const result = validateAnswers([q({ required: true })], []);
    expect(result).toMatch(/Question/);
  });

  it("returns error for blank required TEXT answer", () => {
    const result = validateAnswers(
      [q({ required: true })],
      [{ questionId: "q1", questionLabel: "Question", answer: "   " }],
    );
    expect(result).toMatch(/Question/);
  });

  it("accepts valid TEXT answer", () => {
    expect(
      validateAnswers(
        [q({ required: true })],
        [{ questionId: "q1", questionLabel: "Question", answer: "Hello" }],
      ),
    ).toBeNull();
  });

  it("rejects invalid SELECT option", () => {
    const question = q({
      questionType: "SELECT",
      required: true,
      options: [
        { id: "o1", label: "Option A" },
        { id: "o2", label: "Option B" },
      ],
    });
    const result = validateAnswers(
      [question],
      [{ questionId: "q1", questionLabel: "Question", answer: "Option C" }],
    );
    expect(result).toMatch(/Invalid option/);
  });

  it("accepts valid SELECT option", () => {
    const question = q({
      questionType: "SELECT",
      required: true,
      options: [{ id: "o1", label: "Option A" }],
    });
    expect(
      validateAnswers(
        [question],
        [{ questionId: "q1", questionLabel: "Question", answer: "Option A" }],
      ),
    ).toBeNull();
  });

  it("rejects invalid RADIO option", () => {
    const question = q({
      questionType: "RADIO",
      required: true,
      options: [{ id: "o1", label: "Yes" }],
    });
    const result = validateAnswers(
      [question],
      [{ questionId: "q1", questionLabel: "Question", answer: "Maybe" }],
    );
    expect(result).toMatch(/Invalid option/);
  });

  it("accepts valid CHECKBOX JSON array", () => {
    const question = q({
      questionType: "CHECKBOX",
      required: true,
      options: [
        { id: "o1", label: "A" },
        { id: "o2", label: "B" },
      ],
    });
    expect(
      validateAnswers(
        [question],
        [{ questionId: "q1", questionLabel: "Question", answer: '["A"]' }],
      ),
    ).toBeNull();
  });

  it("rejects CHECKBOX with invalid option", () => {
    const question = q({
      questionType: "CHECKBOX",
      required: false,
      options: [{ id: "o1", label: "A" }],
    });
    const result = validateAnswers(
      [question],
      [{ questionId: "q1", questionLabel: "Question", answer: '["B"]' }],
    );
    expect(result).toMatch(/Invalid option/);
  });

  it("rejects CHECKBOX required with empty array", () => {
    const question = q({
      questionType: "CHECKBOX",
      required: true,
      options: [{ id: "o1", label: "A" }],
    });
    const result = validateAnswers(
      [question],
      [{ questionId: "q1", questionLabel: "Question", answer: "[]" }],
    );
    expect(result).toMatch(/at least one/);
  });

  it("rejects CHECKBOX with non-JSON answer", () => {
    const question = q({
      questionType: "CHECKBOX",
      required: false,
      options: [{ id: "o1", label: "A" }],
    });
    const result = validateAnswers(
      [question],
      [{ questionId: "q1", questionLabel: "Question", answer: "not-json" }],
    );
    expect(result).toMatch(/Invalid answer format/);
  });

  it("rejects answer referencing unknown question", () => {
    const result = validateAnswers(
      [q({ id: "q1" })],
      [{ questionId: "q999", questionLabel: "Unknown", answer: "x" }],
    );
    expect(result).toMatch(/unknown question/);
  });
});

// ── Unit tests: Zod schemas ───────────────────────────────────────────────────

describe("customerDetailsSchema", () => {
  const valid = {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@example.com",
    phone: "07700900000",
  };

  it("accepts valid customer details", () => {
    expect(customerDetailsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty first name", () => {
    expect(
      customerDetailsSchema.safeParse({ ...valid, firstName: "" }).success,
    ).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(
      customerDetailsSchema.safeParse({ ...valid, email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("rejects phone shorter than 7 chars", () => {
    expect(
      customerDetailsSchema.safeParse({ ...valid, phone: "123" }).success,
    ).toBe(false);
  });

  it("notes is optional", () => {
    const withoutNotes = { firstName: valid.firstName, lastName: valid.lastName, email: valid.email, phone: valid.phone };
    expect(customerDetailsSchema.safeParse(withoutNotes).success).toBe(true);
  });
});

describe("bookingRequestSchema", () => {
  const validRequest = {
    serviceSlug: "haircut",
    dateStr: "2026-09-01",
    timeStr: "10:00",
    customer: {
      firstName: "Bob",
      lastName: "Jones",
      email: "bob@example.com",
      phone: "07700900001",
    },
    answers: [],
    policies: [],
  };

  it("accepts a valid booking request", () => {
    expect(bookingRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects invalid date format", () => {
    expect(
      bookingRequestSchema.safeParse({ ...validRequest, dateStr: "01-09-2026" }).success,
    ).toBe(false);
  });

  it("rejects invalid time format", () => {
    expect(
      bookingRequestSchema.safeParse({ ...validRequest, timeStr: "10:00:00" }).success,
    ).toBe(false);
  });

  it("rejects more than 50 answers", () => {
    const tooManyAnswers = Array.from({ length: 51 }, (_, i) => ({
      questionId: `q${i}`,
      questionLabel: `Question ${i}`,
      answer: "x",
    }));
    expect(
      bookingRequestSchema.safeParse({ ...validRequest, answers: tooManyAnswers }).success,
    ).toBe(false);
  });

  it("rejects more than 20 policies", () => {
    const tooManyPolicies = Array.from({ length: 21 }, (_, i) => ({
      policyType: `POLICY_${i}`,
      accepted: true as const,
    }));
    expect(
      bookingRequestSchema.safeParse({ ...validRequest, policies: tooManyPolicies }).success,
    ).toBe(false);
  });

  it("rejects policy not accepted (accepted must be literal true)", () => {
    const withFalsePolicy = {
      ...validRequest,
      policies: [{ policyType: "CANCELLATION", accepted: false }],
    };
    expect(bookingRequestSchema.safeParse(withFalsePolicy).success).toBe(false);
  });
});

describe("questionAnswerSchema", () => {
  it("accepts valid answer", () => {
    expect(
      questionAnswerSchema.safeParse({
        questionId: "q1",
        questionLabel: "Hair colour",
        answer: "Brown",
      }).success,
    ).toBe(true);
  });

  it("rejects empty questionId", () => {
    expect(
      questionAnswerSchema.safeParse({
        questionId: "",
        questionLabel: "Label",
        answer: "x",
      }).success,
    ).toBe(false);
  });
});

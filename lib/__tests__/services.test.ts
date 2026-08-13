import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  slugify,
  penceToPounds,
  poundsToPence,
  formatGBP,
  formatDuration,
  serviceInputSchema,
  serviceCategoryInputSchema,
  serviceQuestionSchema,
  requiresOptions,
  QUESTION_TYPE_LABELS,
  DEPOSIT_TYPE_LABELS,
} from "@/lib/service-schemas";
import { DepositType, QuestionType } from "@/lib/generated/prisma/client";

// ── slugify ────────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases the name", () => {
    expect(slugify("Knotless Braids")).toBe("knotless-braids");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("Box Braids Large")).toBe("box-braids-large");
  });

  it("replaces special characters with hyphens", () => {
    expect(slugify("Hair & Scalp Treatment")).toBe("hair-scalp-treatment");
  });

  it("collapses consecutive non-alphanumeric chars into one hyphen", () => {
    expect(slugify("Cut  &  Style")).toBe("cut-style");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  Braids  ")).toBe("braids");
  });

  it("returns 'service' for an empty string", () => {
    expect(slugify("")).toBe("service");
  });

  it("truncates at 80 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });

  it("handles names with only special characters", () => {
    expect(slugify("!@#$%")).toBe("service");
  });
});

// ── Price helpers ─────────────────────────────────────────────────────────────

describe("penceToPounds", () => {
  it("converts integer pence to decimal pounds string", () => {
    expect(penceToPounds(8000)).toBe("80.00");
  });

  it("handles pennies correctly", () => {
    expect(penceToPounds(8099)).toBe("80.99");
  });

  it("handles zero", () => {
    expect(penceToPounds(0)).toBe("0.00");
  });

  it("rounds to 2 decimal places", () => {
    expect(penceToPounds(100)).toBe("1.00");
  });
});

describe("poundsToPence", () => {
  it("converts pounds string to integer pence", () => {
    expect(poundsToPence("80")).toBe(8000);
  });

  it("handles decimal input", () => {
    expect(poundsToPence("80.99")).toBe(8099);
  });

  it("returns 0 for empty string", () => {
    expect(poundsToPence("")).toBe(0);
  });

  it("returns 0 for non-numeric input", () => {
    expect(poundsToPence("abc")).toBe(0);
  });

  it("rounds a clear midpoint correctly", () => {
    expect(poundsToPence("1.50")).toBe(150);
    expect(poundsToPence("0.01")).toBe(1);
  });
});

describe("formatGBP", () => {
  it("formats pence as GBP", () => {
    expect(formatGBP(8000)).toBe("£80.00");
  });

  it("includes pence in output", () => {
    expect(formatGBP(8099)).toBe("£80.99");
  });
});

describe("formatDuration", () => {
  it("shows minutes only when under an hour", () => {
    expect(formatDuration(30)).toBe("30min");
    expect(formatDuration(45)).toBe("45min");
  });

  it("shows hours only when on the hour", () => {
    expect(formatDuration(60)).toBe("1hr");
    expect(formatDuration(120)).toBe("2hr");
  });

  it("shows hours and minutes for mixed durations", () => {
    expect(formatDuration(90)).toBe("1hr 30min");
    expect(formatDuration(150)).toBe("2hr 30min");
  });
});

// ── serviceInputSchema ─────────────────────────────────────────────────────────

describe("serviceInputSchema", () => {
  const validBase = {
    name: "Knotless Braids",
    durationMins: 120,
    pricePounds: "80.00",
    questions: [],
  };

  it("accepts a valid minimal service", () => {
    const result = serviceInputSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = serviceInputSchema.safeParse({ ...validBase, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects durationMins below 5", () => {
    const result = serviceInputSchema.safeParse({ ...validBase, durationMins: 4 });
    expect(result.success).toBe(false);
  });

  it("rejects durationMins above 480", () => {
    const result = serviceInputSchema.safeParse({ ...validBase, durationMins: 481 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid pricePounds format", () => {
    const result = serviceInputSchema.safeParse({ ...validBase, pricePounds: "not-a-price" });
    expect(result.success).toBe(false);
  });

  it("accepts price with no decimal", () => {
    const result = serviceInputSchema.safeParse({ ...validBase, pricePounds: "80" });
    expect(result.success).toBe(true);
  });

  it("accepts price with one decimal place", () => {
    const result = serviceInputSchema.safeParse({ ...validBase, pricePounds: "80.5" });
    expect(result.success).toBe(true);
  });

  it("rejects price with three decimal places", () => {
    const result = serviceInputSchema.safeParse({ ...validBase, pricePounds: "80.999" });
    expect(result.success).toBe(false);
  });

  it("defaults depositType to NONE", () => {
    const result = serviceInputSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.depositType).toBe(DepositType.NONE);
  });

  it("accepts all valid deposit types", () => {
    for (const dt of Object.values(DepositType)) {
      const result = serviceInputSchema.safeParse({ ...validBase, depositType: dt });
      expect(result.success).toBe(true);
    }
  });

  it("accepts bufferMins of 0", () => {
    const result = serviceInputSchema.safeParse({ ...validBase, bufferMins: 0 });
    expect(result.success).toBe(true);
  });

  it("rejects bufferMins above 120", () => {
    const result = serviceInputSchema.safeParse({ ...validBase, bufferMins: 121 });
    expect(result.success).toBe(false);
  });

  it("defaults active to true and featured to false", () => {
    const result = serviceInputSchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(true);
      expect(result.data.featured).toBe(false);
    }
  });
});

// ── serviceCategoryInputSchema ────────────────────────────────────────────────

describe("serviceCategoryInputSchema", () => {
  it("accepts a valid category", () => {
    const result = serviceCategoryInputSchema.safeParse({
      name: "Braids",
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = serviceCategoryInputSchema.safeParse({ name: "", active: true });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 100 chars", () => {
    const result = serviceCategoryInputSchema.safeParse({
      name: "a".repeat(101),
      active: true,
    });
    expect(result.success).toBe(false);
  });

  it("defaults active to true", () => {
    const result = serviceCategoryInputSchema.safeParse({ name: "Braids" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.active).toBe(true);
  });

  it("accepts optional description", () => {
    const result = serviceCategoryInputSchema.safeParse({
      name: "Braids",
      description: "Box braids, knotless, and more",
      active: true,
    });
    expect(result.success).toBe(true);
  });
});

// ── serviceQuestionSchema ─────────────────────────────────────────────────────

describe("serviceQuestionSchema", () => {
  it("accepts a TEXT question", () => {
    const result = serviceQuestionSchema.safeParse({
      label: "What is your hair type?",
      questionType: QuestionType.TEXT,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty label", () => {
    const result = serviceQuestionSchema.safeParse({
      label: "",
      questionType: QuestionType.TEXT,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all question types", () => {
    for (const qt of Object.values(QuestionType)) {
      const result = serviceQuestionSchema.safeParse({
        label: "Test question",
        questionType: qt,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts SELECT with options", () => {
    const result = serviceQuestionSchema.safeParse({
      label: "Hair length?",
      questionType: QuestionType.SELECT,
      options: [
        { label: "Short", displayOrder: 0 },
        { label: "Medium", displayOrder: 1 },
        { label: "Long", displayOrder: 2 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an option with empty label", () => {
    const result = serviceQuestionSchema.safeParse({
      label: "Hair length?",
      questionType: QuestionType.SELECT,
      options: [{ label: "", displayOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("defaults required to false", () => {
    const result = serviceQuestionSchema.safeParse({
      label: "Anything else?",
      questionType: QuestionType.TEXTAREA,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.required).toBe(false);
  });
});

// ── requiresOptions ───────────────────────────────────────────────────────────

describe("requiresOptions", () => {
  it("returns true for SELECT", () => {
    expect(requiresOptions(QuestionType.SELECT)).toBe(true);
  });

  it("returns true for RADIO", () => {
    expect(requiresOptions(QuestionType.RADIO)).toBe(true);
  });

  it("returns true for CHECKBOX", () => {
    expect(requiresOptions(QuestionType.CHECKBOX)).toBe(true);
  });

  it("returns false for TEXT", () => {
    expect(requiresOptions(QuestionType.TEXT)).toBe(false);
  });

  it("returns false for TEXTAREA", () => {
    expect(requiresOptions(QuestionType.TEXTAREA)).toBe(false);
  });
});

// ── Label maps ────────────────────────────────────────────────────────────────

describe("QUESTION_TYPE_LABELS", () => {
  it("has a label for every QuestionType", () => {
    for (const qt of Object.values(QuestionType)) {
      expect(QUESTION_TYPE_LABELS[qt]).toBeTruthy();
    }
  });
});

describe("DEPOSIT_TYPE_LABELS", () => {
  it("has a label for every DepositType", () => {
    for (const dt of Object.values(DepositType)) {
      expect(DEPOSIT_TYPE_LABELS[dt]).toBeTruthy();
    }
  });
});

// ── Server action auth guards ─────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    service: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({ _max: { displayOrder: -1 } }),
    },
    serviceCategory: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({ _max: { displayOrder: -1 } }),
    },
    serviceQuestion: {
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("services server actions — auth guard", () => {
  beforeEach(async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue(null as any);
  });

  it("createService returns Unauthorised when not logged in", async () => {
    const { createService } = await import("@/lib/actions/services");
    const result = await createService({
      name: "Test",
      description: "",
      categoryId: null,
      durationMins: 60,
      bufferMins: 0,
      pricePounds: "80.00",
      depositType: DepositType.NONE,
      imageUrl: "",
      preparationNotes: "",
      active: true,
      featured: false,
      questions: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("updateService returns Unauthorised when not logged in", async () => {
    const { updateService } = await import("@/lib/actions/services");
    const result = await updateService("some-id", {
      name: "Test",
      description: "",
      categoryId: null,
      durationMins: 60,
      bufferMins: 0,
      pricePounds: "80.00",
      depositType: DepositType.NONE,
      imageUrl: "",
      preparationNotes: "",
      active: true,
      featured: false,
      questions: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("deleteService returns Unauthorised when not logged in", async () => {
    const { deleteService } = await import("@/lib/actions/services");
    const result = await deleteService("some-id");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("setServiceActive returns Unauthorised when not logged in", async () => {
    const { setServiceActive } = await import("@/lib/actions/services");
    const result = await setServiceActive("some-id", false);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("setServiceFeatured returns Unauthorised when not logged in", async () => {
    const { setServiceFeatured } = await import("@/lib/actions/services");
    const result = await setServiceFeatured("some-id", true);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("validateServiceImage returns Unauthorised when not logged in", async () => {
    const { validateServiceImage } = await import("@/lib/actions/services");
    const result = await validateServiceImage(new FormData());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("createCategory returns Unauthorised when not logged in", async () => {
    const { createCategory } = await import("@/lib/actions/services");
    const result = await createCategory({ name: "Braids", active: true });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("updateCategory returns Unauthorised when not logged in", async () => {
    const { updateCategory } = await import("@/lib/actions/services");
    const result = await updateCategory("some-id", {
      name: "Braids",
      active: true,
      displayOrder: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("deleteCategory returns Unauthorised when not logged in", async () => {
    const { deleteCategory } = await import("@/lib/actions/services");
    const result = await deleteCategory("some-id");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });
});

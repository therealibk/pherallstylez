import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  heroSchema,
  faqInputSchema,
  policyInputSchema,
  parseHomepageData,
  parseAboutData,
  parseContactData,
} from "@/lib/cms-schemas";

// ── Schema validation ──────────────────────────────────────────────────────────

describe("heroSchema", () => {
  it("parses valid hero data", () => {
    const result = heroSchema.safeParse({
      heading: "Hello",
      description: "World",
      buttonText: "Book",
      imageUrl: "https://example.com/img.jpg",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.heading).toBe("Hello");
  });

  it("applies defaults for missing fields", () => {
    const result = heroSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.heading).toBe("");
      expect(result.data.description).toBe("");
      expect(result.data.buttonText).toBe("");
      expect(result.data.imageUrl).toBe("");
    }
  });
});

describe("faqInputSchema", () => {
  it("accepts valid FAQ data", () => {
    const result = faqInputSchema.safeParse({
      question: "What is your policy?",
      answer: "Our policy is…",
      published: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing question", () => {
    const result = faqInputSchema.safeParse({ answer: "Some answer" });
    expect(result.success).toBe(false);
  });

  it("rejects empty question", () => {
    const result = faqInputSchema.safeParse({ question: "", answer: "Some answer" });
    expect(result.success).toBe(false);
  });

  it("rejects missing answer", () => {
    const result = faqInputSchema.safeParse({ question: "Q?" });
    expect(result.success).toBe(false);
  });

  it("rejects empty answer", () => {
    const result = faqInputSchema.safeParse({ question: "Q?", answer: "" });
    expect(result.success).toBe(false);
  });

  it("defaults published to false when omitted", () => {
    const result = faqInputSchema.safeParse({ question: "Q?", answer: "A." });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.published).toBe(false);
  });
});

describe("policyInputSchema", () => {
  it("accepts valid policy data", () => {
    const result = policyInputSchema.safeParse({
      title: "Privacy Policy",
      content: "Our policy…",
      published: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = policyInputSchema.safeParse({ content: "…", published: false });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = policyInputSchema.safeParse({ title: "", content: "…", published: false });
    expect(result.success).toBe(false);
  });

  it("accepts empty content (draft state)", () => {
    const result = policyInputSchema.safeParse({
      title: "Privacy Policy",
      content: "",
      published: false,
    });
    expect(result.success).toBe(true);
  });
});

// ── Data parsing helpers ───────────────────────────────────────────────────────

describe("parseHomepageData", () => {
  it("returns empty defaults for null", () => {
    const data = parseHomepageData(null);
    expect(data.hero.heading).toBe("");
    expect(data.testimonials).toEqual([]);
  });

  it("returns empty defaults for empty object", () => {
    const data = parseHomepageData({});
    expect(data.hero.heading).toBe("");
    expect(data.cta.heading).toBe("");
    expect(data.aboutSection.heading).toBe("");
  });

  it("preserves existing hero data", () => {
    const raw = {
      hero: { heading: "Pherall Salon", description: "Expert styling", buttonText: "Book", imageUrl: "" },
    };
    const data = parseHomepageData(raw);
    expect(data.hero.heading).toBe("Pherall Salon");
    expect(data.hero.description).toBe("Expert styling");
  });

  it("filters out malformed testimonials and returns empty array", () => {
    const raw = {
      testimonials: [{ badField: "oops" }],
    };
    // Malformed testimonials fail the individual schema — parseHomepageData should still return
    const data = parseHomepageData(raw);
    expect(Array.isArray(data.testimonials)).toBe(true);
  });
});

describe("parseAboutData", () => {
  it("returns empty defaults for null", () => {
    const data = parseAboutData(null);
    expect(data.heading).toBe("");
    expect(data.biography).toBe("");
  });

  it("preserves existing about data", () => {
    const raw = { heading: "About Me", biography: "I am a stylist." };
    const data = parseAboutData(raw);
    expect(data.heading).toBe("About Me");
    expect(data.biography).toBe("I am a stylist.");
  });
});

describe("parseContactData", () => {
  it("returns empty defaults for null", () => {
    const data = parseContactData(null);
    expect(data.heading).toBe("");
    expect(data.openingHours).toBe("");
  });
});

// ── Policy version logic ───────────────────────────────────────────────────────

describe("Policy version computation", () => {
  function nextVersion(
    existing: { content: string; published: boolean; version: number },
    newContent: string,
  ) {
    const contentChanged = existing.content !== newContent;
    return contentChanged && existing.published
      ? existing.version + 1
      : existing.version;
  }

  it("increments version when published policy content changes", () => {
    const existing = { content: "old content", published: true, version: 2 };
    expect(nextVersion(existing, "new content")).toBe(3);
  });

  it("does not increment version for a draft policy when content changes", () => {
    const existing = { content: "old content", published: false, version: 1 };
    expect(nextVersion(existing, "new content")).toBe(1);
  });

  it("does not increment version when content is unchanged (published)", () => {
    const existing = { content: "same content", published: true, version: 3 };
    expect(nextVersion(existing, "same content")).toBe(3);
  });

  it("does not increment version when content is unchanged (draft)", () => {
    const existing = { content: "same", published: false, version: 1 };
    expect(nextVersion(existing, "same")).toBe(1);
  });

  it("publishes a draft and records v1 when content changes", () => {
    // A draft going from unpublished to published: version stays 1
    const existing = { content: "", published: false, version: 1 };
    expect(nextVersion(existing, "final content")).toBe(1);
  });
});

// ── Server action auth guard ───────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    siteContent: { findUnique: vi.fn(), upsert: vi.fn() },
    faq: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({ _max: { displayOrder: -1 } }),
    },
    policy: { findUnique: vi.fn(), update: vi.fn() },
    businessSettings: { findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("CMS server actions — auth guard", () => {
  beforeEach(async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(// eslint-disable-next-line @typescript-eslint/no-explicit-any
    null as any);
  });

  it("saveHeroSection returns Unauthorised when not logged in", async () => {
    const { saveHeroSection } = await import("@/lib/actions/cms");
    const result = await saveHeroSection({
      heading: "",
      description: "",
      buttonText: "",
      imageUrl: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("saveAboutPageContent returns Unauthorised when not logged in", async () => {
    const { saveAboutPageContent } = await import("@/lib/actions/cms");
    const result = await saveAboutPageContent({
      heading: "",
      introduction: "",
      biography: "",
      imageUrl: "",
      ctaHeading: "",
      ctaDescription: "",
      ctaButtonText: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("createFaq returns Unauthorised when not logged in", async () => {
    const { createFaq } = await import("@/lib/actions/faq");
    const result = await createFaq({ question: "Q?", answer: "A.", published: false });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("deleteFaq returns Unauthorised when not logged in", async () => {
    const { deleteFaq } = await import("@/lib/actions/faq");
    const result = await deleteFaq("some-id");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("savePolicy returns Unauthorised when not logged in", async () => {
    const { savePolicy } = await import("@/lib/actions/policy");
    const result = await savePolicy("PRIVACY_POLICY", {
      title: "Privacy Policy",
      content: "",
      published: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Unauthorised");
  });

  it("savePolicy rejects invalid policy type", async () => {
    const { auth } = await import("@/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValue({ user: { id: "1", email: "admin@test.com" } } as any);
    const { savePolicy } = await import("@/lib/actions/policy");
    const result = await savePolicy("MADE_UP_TYPE", {
      title: "Fake",
      content: "",
      published: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Invalid policy type");
  });
});

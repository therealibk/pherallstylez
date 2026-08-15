import { z } from "zod";

// ── Testimonial ────────────────────────────────────────────────────────────────

export const testimonialSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  quote: z.string().min(1, "Quote is required"),
  role: z.string().default(""),
  displayOrder: z.number().int().default(0),
  published: z.boolean().default(false),
});

export type TestimonialItem = z.infer<typeof testimonialSchema>;

export const testimonialInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quote: z.string().min(1, "Quote is required"),
  role: z.string().default(""),
  displayOrder: z.number().int().default(0),
  published: z.boolean().default(false),
});

export type TestimonialInput = z.infer<typeof testimonialInputSchema>;

// ── Homepage sections ──────────────────────────────────────────────────────────

export const heroSchema = z.object({
  heading: z.string().default(""),
  description: z.string().default(""),
  buttonText: z.string().default(""),
  imageUrl: z.string().default(""),
});

export type HeroData = z.infer<typeof heroSchema>;

export const homepageAboutSectionSchema = z.object({
  heading: z.string().default(""),
  description: z.string().default(""),
  imageUrl: z.string().default(""),
  buttonText: z.string().default(""),
});

export type HomepageAboutSectionData = z.infer<typeof homepageAboutSectionSchema>;

export const ctaSchema = z.object({
  heading: z.string().default(""),
  description: z.string().default(""),
  buttonText: z.string().default(""),
});

export type CtaData = z.infer<typeof ctaSchema>;

export const homepageSchema = z.object({
  hero: heroSchema.default({ heading: "", description: "", buttonText: "", imageUrl: "" }),
  aboutSection: homepageAboutSectionSchema.default({
    heading: "",
    description: "",
    imageUrl: "",
    buttonText: "",
  }),
  testimonials: z.array(testimonialSchema).default([]),
  cta: ctaSchema.default({ heading: "", description: "", buttonText: "" }),
});

export type HomepageData = z.infer<typeof homepageSchema>;

// ── About page ─────────────────────────────────────────────────────────────────

export const aboutPageSchema = z.object({
  heading: z.string().default(""),
  introduction: z.string().default(""),
  biography: z.string().default(""),
  imageUrl: z.string().default(""),
  ctaHeading: z.string().default(""),
  ctaDescription: z.string().default(""),
  ctaButtonText: z.string().default(""),
});

export type AboutPageData = z.infer<typeof aboutPageSchema>;

// ── Contact page ───────────────────────────────────────────────────────────────

export const contactPageSchema = z.object({
  heading: z.string().default(""),
  introduction: z.string().default(""),
  openingHours: z.string().default(""),
});

export type ContactPageData = z.infer<typeof contactPageSchema>;

export const businessContactSchema = z.object({
  email: z.string().default(""),
  phone: z.string().default(""),
  address: z.string().default(""),
  instagramUrl: z.string().default(""),
  tiktokUrl: z.string().default(""),
  facebookUrl: z.string().default(""),
});

export type BusinessContactData = z.infer<typeof businessContactSchema>;

// ── FAQ ────────────────────────────────────────────────────────────────────────

export const faqInputSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  published: z.boolean().default(false),
});

export type FaqInput = z.infer<typeof faqInputSchema>;

// ── Policy ─────────────────────────────────────────────────────────────────────

export const policyInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string(),
  published: z.boolean(),
});

export type PolicyInput = z.infer<typeof policyInputSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function tryParseJson(raw: unknown): unknown {
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}

export function parseHomepageData(raw: unknown): HomepageData {
  const result = homepageSchema.safeParse(tryParseJson(raw));
  return result.success
    ? result.data
    : {
        hero: { heading: "", description: "", buttonText: "", imageUrl: "" },
        aboutSection: { heading: "", description: "", imageUrl: "", buttonText: "" },
        testimonials: [],
        cta: { heading: "", description: "", buttonText: "" },
      };
}

export function parseAboutData(raw: unknown): AboutPageData {
  const result = aboutPageSchema.safeParse(tryParseJson(raw));
  return result.success
    ? result.data
    : {
        heading: "",
        introduction: "",
        biography: "",
        imageUrl: "",
        ctaHeading: "",
        ctaDescription: "",
        ctaButtonText: "",
      };
}

export function parseContactData(raw: unknown): ContactPageData {
  const result = contactPageSchema.safeParse(tryParseJson(raw));
  return result.success
    ? result.data
    : { heading: "", introduction: "", openingHours: "" };
}

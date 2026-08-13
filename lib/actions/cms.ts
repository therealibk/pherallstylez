"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import {
  heroSchema,
  homepageAboutSectionSchema,
  ctaSchema,
  aboutPageSchema,
  contactPageSchema,
  businessContactSchema,
  testimonialSchema,
  parseHomepageData,
  parseContactData,
  type HeroData,
  type HomepageAboutSectionData,
  type CtaData,
  type AboutPageData,
  type ContactPageData,
  type BusinessContactData,
  type TestimonialItem,
} from "@/lib/cms-schemas";

type ActionResult = { success: true } | { success: false; error: string };

async function requireAdmin(): Promise<true | ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };
  return true;
}

// ── Homepage sections ──────────────────────────────────────────────────────────

async function getCurrentHomepageData() {
  const record = await db.siteContent.findUnique({
    where: { section: ContentSection.HOMEPAGE },
  });
  return parseHomepageData(record?.data);
}

export async function saveHeroSection(data: HeroData): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  const parsed = heroSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Invalid hero data" };

  const current = await getCurrentHomepageData();
  const updated = { ...current, hero: parsed.data };

  await db.siteContent.upsert({
    where: { section: ContentSection.HOMEPAGE },
    update: { data: updated as any },
    create: { section: ContentSection.HOMEPAGE, data: updated as any },
  });

  revalidatePath("/admin/content/homepage");
  revalidatePath("/");
  return { success: true };
}

export async function saveHomepageAboutSection(
  data: HomepageAboutSectionData,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  const parsed = homepageAboutSectionSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Invalid about section data" };

  const current = await getCurrentHomepageData();
  const updated = { ...current, aboutSection: parsed.data };

  await db.siteContent.upsert({
    where: { section: ContentSection.HOMEPAGE },
    update: { data: updated as any },
    create: { section: ContentSection.HOMEPAGE, data: updated as any },
  });

  revalidatePath("/admin/content/homepage");
  revalidatePath("/");
  return { success: true };
}

export async function saveCtaSection(data: CtaData): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  const parsed = ctaSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Invalid CTA data" };

  const current = await getCurrentHomepageData();
  const updated = { ...current, cta: parsed.data };

  await db.siteContent.upsert({
    where: { section: ContentSection.HOMEPAGE },
    update: { data: updated as any },
    create: { section: ContentSection.HOMEPAGE, data: updated as any },
  });

  revalidatePath("/admin/content/homepage");
  revalidatePath("/");
  return { success: true };
}

export async function saveTestimonials(
  testimonials: TestimonialItem[],
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  const parsed = testimonials.map((t) => testimonialSchema.safeParse(t));
  if (parsed.some((r) => !r.success)) {
    return { success: false, error: "One or more testimonials have invalid data" };
  }
  const validated = parsed.map((r) => (r as { success: true; data: TestimonialItem }).data);

  const current = await getCurrentHomepageData();
  const updated = { ...current, testimonials: validated };

  await db.siteContent.upsert({
    where: { section: ContentSection.HOMEPAGE },
    update: { data: updated as any },
    create: { section: ContentSection.HOMEPAGE, data: updated as any },
  });

  revalidatePath("/admin/content/homepage");
  revalidatePath("/");
  return { success: true };
}

// ── About page ─────────────────────────────────────────────────────────────────

export async function saveAboutPageContent(
  data: AboutPageData,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  const parsed = aboutPageSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Invalid about page data" };

  await db.siteContent.upsert({
    where: { section: ContentSection.ABOUT },
    update: { data: parsed.data as any },
    create: { section: ContentSection.ABOUT, data: parsed.data as any },
  });

  revalidatePath("/admin/content/about");
  revalidatePath("/about");
  return { success: true };
}

// ── Contact page ───────────────────────────────────────────────────────────────

export async function saveContactPageCopy(
  data: ContactPageData,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  const parsed = contactPageSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Invalid contact page data" };

  const current = await db.siteContent.findUnique({
    where: { section: ContentSection.CONTACT },
  });
  const currentData = parseContactData(current?.data);
  const updated = { ...currentData, ...parsed.data };

  await db.siteContent.upsert({
    where: { section: ContentSection.CONTACT },
    update: { data: updated as any },
    create: { section: ContentSection.CONTACT, data: updated as any },
  });

  revalidatePath("/admin/content/contact");
  revalidatePath("/contact");
  return { success: true };
}

export async function saveBusinessContact(
  data: BusinessContactData,
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth !== true) return auth;

  const parsed = businessContactSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Invalid contact details" };

  const settings = await db.businessSettings.findFirst();
  if (!settings) return { success: false, error: "Business settings not found" };

  await db.businessSettings.update({
    where: { id: settings.id },
    data: {
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      instagramUrl: parsed.data.instagramUrl || null,
      tiktokUrl: parsed.data.tiktokUrl || null,
      facebookUrl: parsed.data.facebookUrl || null,
    },
  });

  revalidatePath("/admin/content/contact");
  revalidatePath("/contact");
  return { success: true };
}

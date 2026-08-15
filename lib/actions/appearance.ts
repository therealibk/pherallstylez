"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  appearanceColorsSchema,
  detectImageMime,
  buildDataUrl,
  IMAGE_SIZE_LIMITS,
  ALLOWED_FONTS,
  parseAppearanceData,
  type ImageUploadType,
  type FontKey,
  type AppearanceColors,
} from "@/lib/appearance-schemas";
import { z } from "zod";

type ActionResult = { success: true } | { success: false; error: string };
type UploadResult = { success: true; url: string } | { success: false; error: string };

async function requireAdmin(): Promise<true | { success: false; error: string }> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };
  return true;
}

async function getCurrentAppearanceData() {
  const settings = await db.businessSettings.findFirst();
  return parseAppearanceData(settings?.appearanceData);
}

// ── Save colours + font ────────────────────────────────────────────────────────

export async function saveAppearanceSettings(data: {
  colors: AppearanceColors;
  font: FontKey;
}): Promise<ActionResult> {
  const authed = await requireAdmin();
  if (authed !== true) return authed;

  const fontResult = z.enum(ALLOWED_FONTS).safeParse(data.font);
  if (!fontResult.success) return { success: false, error: "Invalid font selection" };

  const colorsResult = appearanceColorsSchema.safeParse(data.colors);
  if (!colorsResult.success) {
    const first = Object.values(colorsResult.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: first ?? "Invalid colour values" };
  }

  const current = await getCurrentAppearanceData();
  const updated = {
    ...current,
    colors: colorsResult.data,
    font: fontResult.data,
  };

  const settings = await db.businessSettings.findFirst();
  if (!settings) return { success: false, error: "Business settings not found" };

  await db.businessSettings.update({
    where: { id: settings.id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { appearanceData: updated as any },
  });

  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/faq");

  return { success: true };
}

// ── Upload logo ────────────────────────────────────────────────────────────────

export async function uploadLogoImage(formData: FormData): Promise<UploadResult> {
  const authed = await requireAdmin();
  if (authed !== true) return authed;

  return uploadAndSaveLogo(formData);
}

async function uploadAndSaveLogo(formData: FormData): Promise<UploadResult> {
  const result = await validateImageUpload(formData, "logo");
  if (!result.success) return result;

  const settings = await db.businessSettings.findFirst();
  if (!settings) return { success: false, error: "Business settings not found" };

  await db.businessSettings.update({
    where: { id: settings.id },
    data: { logoUrl: result.url },
  });

  revalidatePath("/admin/content/appearance");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/contact");
  revalidatePath("/faq");

  return { success: true, url: result.url };
}

// ── Upload favicon ─────────────────────────────────────────────────────────────

export async function uploadFaviconImage(formData: FormData): Promise<UploadResult> {
  const authed = await requireAdmin();
  if (authed !== true) return authed;

  const result = await validateImageUpload(formData, "favicon");
  if (!result.success) return result;

  const settings = await db.businessSettings.findFirst();
  if (!settings) return { success: false, error: "Business settings not found" };

  const current = await getCurrentAppearanceData();
  const updated = { ...current, faviconUrl: result.url };

  await db.businessSettings.update({
    where: { id: settings.id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { appearanceData: updated as any },
  });

  revalidatePath("/admin/content/appearance");

  return { success: true, url: result.url };
}

// ── Upload CMS section image (hero, about) — validates only, caller saves ──────

export async function uploadCmsImage(
  formData: FormData,
  type: Extract<ImageUploadType, "hero" | "about">,
): Promise<UploadResult> {
  const authed = await requireAdmin();
  if (authed !== true) return authed;

  return validateImageUpload(formData, type);
}

// ── Shared validation ──────────────────────────────────────────────────────────

async function validateImageUpload(
  formData: FormData,
  type: ImageUploadType,
): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file provided" };

  const sizeLimit = IMAGE_SIZE_LIMITS[type];
  if (file.size > sizeLimit) {
    const limitKb = Math.round(sizeLimit / 1024);
    return { success: false, error: `File too large. Maximum size is ${limitKb} KB.` };
  }

  if (file.size === 0) return { success: false, error: "File is empty" };

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const detectedMime = detectImageMime(bytes);
  if (!detectedMime) {
    return {
      success: false,
      error: "File type not supported. Please upload a JPEG, PNG, or WebP image.",
    };
  }

  const base64 = Buffer.from(buffer).toString("base64");
  const url = buildDataUrl(detectedMime, base64);

  return { success: true, url };
}

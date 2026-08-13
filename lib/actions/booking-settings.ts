"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type ActionResult = { success: true } | { success: false; error: string };
type FailResult = { success: false; error: string };

async function requireAdmin(): Promise<true | FailResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };
  return true;
}

// ── Booking Settings ──────────────────────────────────────────────────────────

const bookingSettingsSchema = z.object({
  minNoticeHours: z.number().int().min(0).max(168),
  maxAdvanceDays: z.number().int().min(1).max(365),
  defaultBufferMins: z.number().int().min(0).max(120),
  cancellationDeadlineHours: z.number().int().min(0).max(168),
  reschedulingDeadlineHours: z.number().int().min(0).max(168),
  customerCanCancel: z.boolean(),
  customerCanReschedule: z.boolean(),
  depositRequired: z.boolean(),
  paymentHoldMins: z.number().int().min(5).max(60),
  reminderHours: z.array(z.number().int().min(1).max(168)).max(5),
});

export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>;

export async function saveBookingSettings(
  data: BookingSettingsInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = bookingSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const existing = await db.bookingSettings.findFirst();

  if (existing) {
    await db.bookingSettings.update({
      where: { id: existing.id },
      data: parsed.data,
    });
  } else {
    await db.bookingSettings.create({ data: parsed.data });
  }

  revalidatePath("/admin/settings/booking");
  return { success: true };
}

export async function getBookingSettings() {
  const settings = await db.bookingSettings.findFirst();
  if (!settings) {
    // Return schema defaults if no row exists yet
    return {
      minNoticeHours: 24,
      maxAdvanceDays: 90,
      defaultBufferMins: 0,
      cancellationDeadlineHours: 24,
      reschedulingDeadlineHours: 24,
      customerCanCancel: true,
      customerCanReschedule: true,
      depositRequired: true,
      paymentHoldMins: 15,
      reminderHours: [48, 24],
    };
  }
  return settings;
}

// ── Business Settings (timezone + core info) ──────────────────────────────────

const VALID_TIMEZONES = Intl.supportedValuesOf
  ? Intl.supportedValuesOf("timeZone")
  : null;

const businessSettingsSchema = z.object({
  businessName: z.string().min(1).max(200),
  ownerName: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  timezone: z.string().refine(
    (tz) => {
      if (VALID_TIMEZONES) return VALID_TIMEZONES.includes(tz);
      // Fallback: try to use it in Intl and catch errors
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid timezone" },
  ),
  currency: z.string().length(3).default("GBP"),
});

export type BusinessSettingsInput = z.infer<typeof businessSettingsSchema>;

export async function saveBusinessSettings(
  data: BusinessSettingsInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = businessSettingsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const existing = await db.businessSettings.findFirst();

  if (existing) {
    await db.businessSettings.update({
      where: { id: existing.id },
      data: {
        businessName: parsed.data.businessName,
        ownerName: parsed.data.ownerName,
        email: parsed.data.email,
        phone: parsed.data.phone?.trim() || null,
        address: parsed.data.address?.trim() || null,
        timezone: parsed.data.timezone,
        currency: parsed.data.currency,
      },
    });
  } else {
    await db.businessSettings.create({
      data: {
        businessName: parsed.data.businessName,
        ownerName: parsed.data.ownerName,
        email: parsed.data.email,
        phone: parsed.data.phone?.trim() || null,
        address: parsed.data.address?.trim() || null,
        timezone: parsed.data.timezone,
        currency: parsed.data.currency,
      },
    });
  }

  revalidatePath("/admin/settings/business");
  revalidatePath("/admin/availability");
  return { success: true };
}

export async function getBusinessSettings() {
  const settings = await db.businessSettings.findFirst();
  return settings ?? {
    businessName: "Pherall",
    ownerName: "",
    email: "",
    phone: null,
    address: null,
    timezone: "Europe/London",
    currency: "GBP",
  };
}

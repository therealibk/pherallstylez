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

// ── Availability Rules ────────────────────────────────────────────────────────

const ruleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  active: z.boolean().default(true),
});

export type AvailabilityRuleInput = z.infer<typeof ruleSchema>;

/**
 * Replace all availability rules with the provided set.
 * The UI sends the complete weekly schedule; we delete-and-recreate in a transaction.
 */
export async function saveAvailabilityRules(
  rules: AvailabilityRuleInput[],
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = z.array(ruleSchema).safeParse(rules);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid rules" };
  }

  // Validate: startTime must be before endTime for each rule
  for (const rule of parsed.data) {
    if (rule.startTime >= rule.endTime) {
      return {
        success: false,
        error: `Start time must be before end time (got ${rule.startTime}–${rule.endTime})`,
      };
    }
  }

  await db.$transaction([
    db.availabilityRule.deleteMany(),
    db.availabilityRule.createMany({ data: parsed.data }),
  ]);

  revalidatePath("/admin/availability");
  return { success: true };
}

export async function getAvailabilityRules() {
  return db.availabilityRule.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

// ── Blocked Periods ───────────────────────────────────────────────────────────

const blockedPeriodSchema = z.object({
  startAt: z.string().datetime({ message: "Invalid start date/time" }),
  endAt: z.string().datetime({ message: "Invalid end date/time" }),
  allDay: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

export type BlockedPeriodInput = z.infer<typeof blockedPeriodSchema>;

export async function createBlockedPeriod(
  data: BlockedPeriodInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = blockedPeriodSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const start = new Date(parsed.data.startAt);
  const end = new Date(parsed.data.endAt);

  if (end <= start) {
    return { success: false, error: "End date/time must be after start" };
  }

  await db.blockedPeriod.create({
    data: {
      startAt: start,
      endAt: end,
      allDay: parsed.data.allDay,
      reason: parsed.data.reason?.trim() || null,
    },
  });

  revalidatePath("/admin/blocked-times");
  return { success: true };
}

export async function updateBlockedPeriod(
  id: string,
  data: BlockedPeriodInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = blockedPeriodSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const start = new Date(parsed.data.startAt);
  const end = new Date(parsed.data.endAt);

  if (end <= start) {
    return { success: false, error: "End date/time must be after start" };
  }

  const existing = await db.blockedPeriod.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Blocked period not found" };

  await db.blockedPeriod.update({
    where: { id },
    data: {
      startAt: start,
      endAt: end,
      allDay: parsed.data.allDay,
      reason: parsed.data.reason?.trim() || null,
    },
  });

  revalidatePath("/admin/blocked-times");
  return { success: true };
}

export async function deleteBlockedPeriod(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const existing = await db.blockedPeriod.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Blocked period not found" };

  await db.blockedPeriod.delete({ where: { id } });

  revalidatePath("/admin/blocked-times");
  return { success: true };
}

export async function getBlockedPeriods(opts?: {
  fromDate?: Date;
  toDate?: Date;
}) {
  return db.blockedPeriod.findMany({
    where: opts?.fromDate && opts?.toDate
      ? { startAt: { lte: opts.toDate }, endAt: { gte: opts.fromDate } }
      : undefined,
    orderBy: { startAt: "asc" },
  });
}

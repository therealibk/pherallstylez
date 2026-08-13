"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PolicyType } from "@/lib/generated/prisma/client";
import { policyInputSchema, type PolicyInput } from "@/lib/cms-schemas";

type ActionResult = { success: true; version: number } | { success: false; error: string };

// All valid policy types — server-side list, never trust the browser's claim
const VALID_POLICY_TYPES = [
  PolicyType.PRIVACY_POLICY,
  PolicyType.TERMS_AND_CONDITIONS,
  PolicyType.BOOKING_POLICY,
  PolicyType.APPOINTMENT_POLICY,
  PolicyType.CANCELLATION_POLICY,
  PolicyType.REFUND_POLICY,
] as const;

const policyTypeSchema = z.enum(VALID_POLICY_TYPES);

const POLICY_PUBLIC_PATHS: Record<PolicyType, string> = {
  [PolicyType.PRIVACY_POLICY]: "/privacy-policy",
  [PolicyType.TERMS_AND_CONDITIONS]: "/terms-and-conditions",
  [PolicyType.BOOKING_POLICY]: "/booking-policy",
  [PolicyType.APPOINTMENT_POLICY]: "/appointment-policy",
  [PolicyType.CANCELLATION_POLICY]: "/cancellation-policy",
  [PolicyType.REFUND_POLICY]: "/refund-policy",
};

const POLICY_ADMIN_PATHS: Record<PolicyType, string> = {
  [PolicyType.PRIVACY_POLICY]: "/admin/policies/privacy-policy",
  [PolicyType.TERMS_AND_CONDITIONS]: "/admin/policies/terms-and-conditions",
  [PolicyType.BOOKING_POLICY]: "/admin/policies/booking-policy",
  [PolicyType.APPOINTMENT_POLICY]: "/admin/policies/appointment-policy",
  [PolicyType.CANCELLATION_POLICY]: "/admin/policies/cancellation-policy",
  [PolicyType.REFUND_POLICY]: "/admin/policies/refund-policy",
};

export async function savePolicy(
  rawType: string,
  data: PolicyInput,
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };

  // Validate the type is one of the known policy types — reject arbitrary values
  const typeResult = policyTypeSchema.safeParse(rawType);
  if (!typeResult.success) {
    return { success: false, error: "Invalid policy type" };
  }
  const type = typeResult.data;

  const parsed = policyInputSchema.safeParse(data);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: first ?? "Invalid policy data" };
  }

  const existing = await db.policy.findUnique({ where: { type } });
  if (!existing) return { success: false, error: "Policy not found" };

  // Increment version only when content changes on a previously-published policy.
  // This ensures PolicyAcceptance records remain accurate snapshots of the version
  // that was accepted, while the current policy row always reflects the latest content.
  const contentChanged = existing.content !== parsed.data.content;
  const newVersion =
    contentChanged && existing.published ? existing.version + 1 : existing.version;

  await db.policy.update({
    where: { type },
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      published: parsed.data.published,
      version: newVersion,
    },
  });

  revalidatePath(POLICY_ADMIN_PATHS[type]);
  revalidatePath(POLICY_PUBLIC_PATHS[type]);
  return { success: true, version: newVersion };
}

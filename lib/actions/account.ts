"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { profileSchema, passwordSchema } from "@/lib/account-schema";
import type { ProfileInput, PasswordInput } from "@/lib/account-schema";

type ActionResult = { success: true } | { success: false; error: string };
type FailResult = { success: false; error: string };

// ── Auth guard ────────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<{ userId: string } | FailResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorised" };
  return { userId: session.user.id };
}

// ── updateProfile ──────────────────────────────────────────────────────────────

export async function updateProfile(data: ProfileInput): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("success" in guard) return guard;
  const { userId } = guard;

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { name, email } = parsed.data;

  const conflict = await db.user.findFirst({
    where: { email, NOT: { id: userId } },
    select: { id: true },
  });
  if (conflict) {
    return { success: false, error: "That email address is already in use." };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { name, email },
    });
  } catch {
    return { success: false, error: "Unable to update profile. Please try again." };
  }

  revalidatePath("/admin/settings/account");
  return { success: true };
}

// ── updatePassword ─────────────────────────────────────────────────────────────

export async function updatePassword(data: PasswordInput): Promise<ActionResult> {
  const guard = await requireAdmin();
  if ("success" in guard) return guard;
  const { userId } = guard;

  const { allowed } = checkRateLimit(`password-change:${userId}`);
  if (!allowed) {
    return {
      success: false,
      error: "Too many attempts. Please wait 15 minutes before trying again.",
    };
  }

  const parsed = passwordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid data" };
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user) {
    return { success: false, error: "Account not found." };
  }

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    return { success: false, error: "Incorrect current password." };
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  try {
    await db.user.update({
      where: { id: userId },
      data: { password: newHash },
    });
  } catch {
    return { success: false, error: "Unable to update password. Please try again." };
  }

  return { success: true };
}

// ── getAccountData ────────────────────────────────────────────────────────────

export async function getAccountData(): Promise<{ name: string; email: string } | null> {
  const guard = await requireAdmin();
  if ("success" in guard) return null;
  const { userId } = guard;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) return null;
  return { name: user.name ?? "", email: user.email };
}

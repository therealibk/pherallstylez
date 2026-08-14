"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { richTextFieldSchema } from "@/lib/rich-text";
import {
  buildEmailFromCmsTemplate,
  buildPreviewVars,
} from "@/lib/email-templates";
import type { NotificationType } from "@/lib/generated/prisma/client";
import { Resend } from "resend";

type FailResult = { success: false; error: string };

async function requireAdmin(): Promise<true | FailResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };
  return true;
}

// ── Load all templates ─────────────────────────────────────────────────────────

export async function getAllEmailTemplates() {
  const guard = await requireAdmin();
  if (guard !== true) return null;

  return db.emailTemplate.findMany({
    select: { id: true, type: true, subject: true, active: true, updatedAt: true },
    orderBy: { type: "asc" },
  });
}

// ── Load single template ───────────────────────────────────────────────────────

export async function getEmailTemplate(type: NotificationType) {
  const guard = await requireAdmin();
  if (guard !== true) return null;

  return db.emailTemplate.findUnique({
    where: { type },
    select: { id: true, type: true, subject: true, body: true, active: true, updatedAt: true },
  });
}

// ── Save template ─────────────────────────────────────────────────────────────

const saveTemplateSchema = z.object({
  type: z.string().min(1),
  subject: z.string().min(1, "Subject is required").max(500),
  body: richTextFieldSchema,
  active: z.boolean(),
});

export async function saveEmailTemplate(
  input: unknown,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = saveTemplateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await db.emailTemplate.update({
      where: { type: parsed.data.type as NotificationType },
      data: {
        subject: parsed.data.subject,
        body: parsed.data.body,
        active: parsed.data.active,
      },
    });
    revalidatePath("/admin/content/email-templates");
    return { success: true };
  } catch (err) {
    console.error("[saveEmailTemplate]", err);
    return { success: false, error: "Failed to save template. Please try again." };
  }
}

// ── Preview template ──────────────────────────────────────────────────────────

export async function previewEmailTemplate(
  type: NotificationType,
  subject: string,
  body: string,
): Promise<{ success: true; html: string; subject: string } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  try {
    const business = await db.businessSettings.findFirst({
      select: { businessName: true },
    });
    const businessName = business?.businessName ?? "Pherall";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const vars = buildPreviewVars(businessName, appUrl);

    const { subject: renderedSubject, html } = buildEmailFromCmsTemplate(
      subject,
      body,
      vars,
      businessName,
      vars["manage_booking_url"],
    );
    return { success: true, html, subject: renderedSubject };
  } catch (err) {
    console.error("[previewEmailTemplate]", err);
    return { success: false, error: "Preview failed. Please check your template." };
  }
}

// ── Send test email ────────────────────────────────────────────────────────────

const testSendSchema = z.object({
  type: z.string().min(1),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  testEmail: z.string().email("Invalid email address"),
});

export async function sendTestEmail(
  input: unknown,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = testSendSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const settings = await db.businessSettings.findFirst({
    select: { businessName: true, resendApiKey: true, emailFrom: true },
  });
  const apiKey = settings?.resendApiKey || process.env.RESEND_API_KEY || null;
  const from = settings?.emailFrom || process.env.EMAIL_FROM || "noreply@example.com";

  if (!apiKey) {
    return { success: false, error: "Email is not configured. Add a Resend API key in Admin → Settings → Notifications." };
  }

  const businessName = settings?.businessName ?? "Pherall";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const vars = buildPreviewVars(businessName, appUrl);

  const { subject, html } = buildEmailFromCmsTemplate(
    parsed.data.subject,
    parsed.data.body,
    vars,
    businessName,
    vars["manage_booking_url"],
  );

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: parsed.data.testEmail,
      subject: `[TEST] ${subject}`,
      html,
    });
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to send: ${msg.slice(0, 200)}` };
  }
}

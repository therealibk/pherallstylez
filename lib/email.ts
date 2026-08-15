import { Resend } from "resend";
import { db } from "@/lib/db";
import {
  buildEmailTemplate,
  buildEmailFromCmsTemplate,
  buildEmailVars,
  type AppointmentEmailData,
} from "@/lib/email-templates";
import { parseAppearanceData } from "@/lib/appearance-schemas";
import type { NotificationType } from "@/lib/generated/prisma/client";

/** Resolve email config and branding from DB, falling back to env vars. */
async function getEmailConfig(): Promise<{
  apiKey: string | null;
  from: string;
  logoUrl: string | null;
  buttonColor: string;
  buttonTextColor: string;
}> {
  const settings = await db.businessSettings.findFirst({
    select: { resendApiKey: true, emailFrom: true, logoUrl: true, appearanceData: true },
  });
  const apiKey = settings?.resendApiKey || process.env.RESEND_API_KEY || null;
  const from =
    settings?.emailFrom || process.env.EMAIL_FROM || "noreply@example.com";
  const logoUrl = settings?.logoUrl ?? null;
  const appearance = parseAppearanceData(settings?.appearanceData);
  const buttonColor = appearance.colors["--button"] ?? "#1a1a1a";
  const buttonTextColor = appearance.colors["--button-foreground"] ?? "#ffffff";
  return { apiKey, from, logoUrl, buttonColor, buttonTextColor };
}

/** Load active CMS template for a given type, or null if not found / inactive. */
async function loadCmsTemplate(
  type: NotificationType,
): Promise<{ subject: string; body: string } | null> {
  try {
    const tmpl = await db.emailTemplate.findUnique({
      where: { type },
      select: { subject: true, body: true, active: true },
    });
    if (!tmpl || !tmpl.active) return null;
    return { subject: tmpl.subject, body: tmpl.body };
  } catch {
    return null;
  }
}

export interface SendNotificationInput {
  appointmentId: string;
  type: NotificationType;
  recipientEmail: string;
  deduplicationKey: string;
  data: AppointmentEmailData;
  reminderOffsetHours?: number;
}

/**
 * Send a transactional notification email.
 *
 * Idempotent: the unique deduplicationKey prevents duplicate sends.
 * Fire-and-forget safe: errors are logged but never thrown.
 * Graceful no-op: if no API key is configured, skips send but still logs.
 * CMS-aware: loads the active CMS template when available, falls back to hardcoded.
 */
export async function sendNotification(input: SendNotificationInput): Promise<void> {
  const { appointmentId, type, recipientEmail, deduplicationKey, data, reminderOffsetHours } = input;

  // Reserve the send slot via the unique deduplicationKey constraint.
  // If another call already reserved it, skip silently.
  let logId: string;
  try {
    const log = await db.notificationLog.create({
      data: {
        appointmentId,
        type,
        recipientEmail,
        deduplicationKey,
        status: "PENDING",
        reminderOffsetHours: reminderOffsetHours ?? null,
      },
      select: { id: true },
    });
    logId = log.id;
  } catch {
    // Unique constraint violation — already reserved; skip
    return;
  }

  // Resolve subject + html from CMS template (preferred) or hardcoded fallback
  const [cmsTemplate, { apiKey, from, logoUrl, buttonColor, buttonTextColor }] = await Promise.all([
    loadCmsTemplate(type),
    getEmailConfig(),
  ]);

  const enrichedData: AppointmentEmailData = {
    ...data,
    reminderOffsetHours,
    logoUrl: data.logoUrl ?? logoUrl,
    buttonColor: data.buttonColor ?? buttonColor,
    buttonTextColor: data.buttonTextColor ?? buttonTextColor,
  };

  let subject: string;
  let html: string;

  if (cmsTemplate) {
    const vars = buildEmailVars(type, enrichedData);
    ({ subject, html } = buildEmailFromCmsTemplate(
      cmsTemplate.subject,
      cmsTemplate.body,
      vars,
      enrichedData.businessName,
      enrichedData.manageUrl,
      enrichedData.logoUrl,
      enrichedData.buttonColor,
      enrichedData.buttonTextColor,
    ));
  } else {
    ({ subject, html } = buildEmailTemplate(type, enrichedData));
  }

  if (!apiKey) {
    console.log(`[email] No API key configured — skipping send for ${deduplicationKey}`);
    await db.notificationLog.update({
      where: { id: logId },
      data: { status: "FAILED", error: "RESEND_API_KEY not configured" },
    });
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({ from, to: recipientEmail, subject, html });
    await db.notificationLog.update({
      where: { id: logId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        resendMessageId: result.data?.id ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[email] Failed to send ${deduplicationKey}:`, message);
    await db.notificationLog.update({
      where: { id: logId },
      data: { status: "FAILED", error: message.slice(0, 500) },
    });
  }
}

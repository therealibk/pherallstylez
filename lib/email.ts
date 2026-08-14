import { Resend } from "resend";
import { db } from "@/lib/db";
import { buildEmailTemplate, type AppointmentEmailData } from "@/lib/email-templates";
import type { NotificationType } from "@/lib/generated/prisma/client";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
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
 * Graceful no-op: if RESEND_API_KEY is not set, skips send but still logs.
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

  const resend = getResend();
  const from = process.env.EMAIL_FROM ?? "noreply@example.com";
  const { subject, html } = buildEmailTemplate(type, data);

  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set — skipping send for ${deduplicationKey}`);
    await db.notificationLog.update({
      where: { id: logId },
      data: { status: "FAILED", error: "RESEND_API_KEY not configured" },
    });
    return;
  }

  try {
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

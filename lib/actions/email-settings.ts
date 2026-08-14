"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { maskKey } from "@/lib/stripe";
import { z } from "zod";

type FailResult = { success: false; error: string };

async function requireAdmin(): Promise<true | FailResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorised" };
  return true;
}

const emailSettingsSchema = z.object({
  resendApiKey: z.string().max(500).optional(),
  emailFrom: z
    .string()
    .email("Must be a valid email address")
    .max(200)
    .optional(),
});

export async function saveEmailSettings(
  apiKey: string,
  fromAddress: string,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = emailSettingsSchema.safeParse({
    resendApiKey: apiKey || undefined,
    emailFrom: fromAddress || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data: Record<string, string> = {};
  if (parsed.data.resendApiKey) data.resendApiKey = parsed.data.resendApiKey;
  if (parsed.data.emailFrom) data.emailFrom = parsed.data.emailFrom;

  if (Object.keys(data).length === 0) {
    return { success: false, error: "No values provided" };
  }

  await db.businessSettings.updateMany({ data });
  return { success: true };
}

export async function clearEmailField(
  field: "resendApiKey" | "emailFrom",
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  await db.businessSettings.updateMany({ data: { [field]: null } });
  return { success: true };
}

/** Returns masked API key for display — never returns the actual key. */
export async function getEmailKeyStatus(): Promise<{
  apiKey: string | null;
  apiKeySource: "db" | "env" | null;
  fromAddress: string | null;
  fromAddressSource: "db" | "env" | null;
}> {
  const guard = await requireAdmin();
  if (guard !== true) {
    return { apiKey: null, apiKeySource: null, fromAddress: null, fromAddressSource: null };
  }

  const settings = await db.businessSettings.findFirst({
    select: { resendApiKey: true, emailFrom: true },
  });

  const resolvedKey = settings?.resendApiKey || process.env.RESEND_API_KEY || null;
  const resolvedFrom =
    settings?.emailFrom || process.env.EMAIL_FROM || null;

  return {
    apiKey: resolvedKey ? maskKey(resolvedKey) : null,
    apiKeySource: settings?.resendApiKey ? "db" : process.env.RESEND_API_KEY ? "env" : null,
    fromAddress: resolvedFrom,
    fromAddressSource: settings?.emailFrom ? "db" : process.env.EMAIL_FROM ? "env" : null,
  };
}

/** Send a test email to the given address. */
export async function sendTestEmail(
  toEmail: string,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = z.string().email().safeParse(toEmail);
  if (!parsed.success) return { success: false, error: "Invalid email address" };

  const settings = await db.businessSettings.findFirst({
    select: { resendApiKey: true, emailFrom: true, businessName: true },
  });

  const apiKey = settings?.resendApiKey || process.env.RESEND_API_KEY || null;
  if (!apiKey) {
    return { success: false, error: "No API key configured. Save your Resend API key first." };
  }

  const from = settings?.emailFrom || process.env.EMAIL_FROM || "noreply@example.com";
  const businessName = settings?.businessName ?? "Pherall";

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from,
      to: parsed.data,
      subject: `Test email from ${businessName}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#111">
          <h2 style="margin:0 0 12px">Email delivery is working ✓</h2>
          <p style="color:#555;margin:0 0 8px">
            This is a test email from <strong>${businessName}</strong>.
            Your Resend integration is configured correctly.
          </p>
          <p style="color:#999;font-size:13px;margin:16px 0 0">
            Sent via: ${from}
          </p>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message.slice(0, 300) };
  }
}

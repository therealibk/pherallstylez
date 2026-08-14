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

const stripeKeysSchema = z.object({
  stripeSecretKey: z.string().max(500).optional(),
  stripePublishableKey: z.string().max(500).optional(),
  stripeWebhookSecret: z.string().max(500).optional(),
});

export async function saveStripeKeys(
  secretKey: string,
  publishableKey: string,
  webhookSecret: string,
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  const parsed = stripeKeysSchema.safeParse({
    stripeSecretKey: secretKey || undefined,
    stripePublishableKey: publishableKey || undefined,
    stripeWebhookSecret: webhookSecret || undefined,
  });
  if (!parsed.success) return { success: false, error: "Invalid input" };

  // Only update fields that were provided (non-empty strings)
  const data: Record<string, string> = {};
  if (parsed.data.stripeSecretKey) data.stripeSecretKey = parsed.data.stripeSecretKey;
  if (parsed.data.stripePublishableKey) data.stripePublishableKey = parsed.data.stripePublishableKey;
  if (parsed.data.stripeWebhookSecret) data.stripeWebhookSecret = parsed.data.stripeWebhookSecret;

  if (Object.keys(data).length === 0) {
    return { success: false, error: "No keys provided" };
  }

  await db.businessSettings.updateMany({ data });
  return { success: true };
}

export async function clearStripeKey(
  field: "stripeSecretKey" | "stripePublishableKey" | "stripeWebhookSecret",
): Promise<{ success: true } | FailResult> {
  const guard = await requireAdmin();
  if (guard !== true) return guard;

  await db.businessSettings.updateMany({ data: { [field]: null } });
  return { success: true };
}

/** Returns masked key values for display — never returns the actual key. */
export async function getStripeKeyStatus(): Promise<{
  secretKey: string | null;
  publishableKey: string | null;
  webhookSecret: string | null;
  secretKeySource: "db" | "env" | null;
  publishableKeySource: "db" | "env" | null;
  webhookSecretSource: "db" | "env" | null;
}> {
  const guard = await requireAdmin();
  if (guard !== true) {
    return {
      secretKey: null,
      publishableKey: null,
      webhookSecret: null,
      secretKeySource: null,
      publishableKeySource: null,
      webhookSecretSource: null,
    };
  }

  const settings = await db.businessSettings.findFirst({
    select: { stripeSecretKey: true, stripePublishableKey: true, stripeWebhookSecret: true },
  });

  const resolvedSecret = settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || null;
  const resolvedPublishable =
    settings?.stripePublishableKey ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    null;
  const resolvedWebhook = settings?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || null;

  return {
    secretKey: resolvedSecret ? maskKey(resolvedSecret) : null,
    publishableKey: resolvedPublishable ? maskKey(resolvedPublishable) : null,
    webhookSecret: resolvedWebhook ? maskKey(resolvedWebhook) : null,
    secretKeySource: settings?.stripeSecretKey ? "db" : process.env.STRIPE_SECRET_KEY ? "env" : null,
    publishableKeySource: settings?.stripePublishableKey
      ? "db"
      : process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        ? "env"
        : null,
    webhookSecretSource: settings?.stripeWebhookSecret
      ? "db"
      : process.env.STRIPE_WEBHOOK_SECRET
        ? "env"
        : null,
  };
}

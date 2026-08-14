import Stripe from "stripe";
import { db } from "@/lib/db";

const STRIPE_API_VERSION = "2026-07-29.dahlia" as const;

/** Resolve the Stripe secret key: DB row takes precedence over env var. */
async function resolveSecretKey(): Promise<string | null> {
  const settings = await db.businessSettings.findFirst({
    select: { stripeSecretKey: true },
  });
  return settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY || null;
}

/** Resolve the Stripe webhook secret: DB row takes precedence over env var. */
export async function resolveWebhookSecret(): Promise<string | null> {
  const settings = await db.businessSettings.findFirst({
    select: { stripeWebhookSecret: true },
  });
  return settings?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || null;
}

/** Resolve the Stripe publishable key: DB row takes precedence over env var. */
export async function resolvePublishableKey(): Promise<string | null> {
  const settings = await db.businessSettings.findFirst({
    select: { stripePublishableKey: true },
  });
  return (
    settings?.stripePublishableKey ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    null
  );
}

/**
 * Server-only Stripe client.
 * Reads the secret key from the database (admin-configured) then falls back
 * to the STRIPE_SECRET_KEY environment variable.
 * Never import from client components.
 */
export async function getStripe(): Promise<Stripe> {
  const key = await resolveSecretKey();
  if (!key) {
    throw new Error(
      "Stripe is not configured. Add your Secret Key in Admin → Settings → Payments.",
    );
  }
  return new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });
}

/** True when all three Stripe credentials are available (DB or env). */
export async function isStripeConfigured(): Promise<boolean> {
  const settings = await db.businessSettings.findFirst({
    select: { stripeSecretKey: true, stripePublishableKey: true, stripeWebhookSecret: true },
  });
  const secretKey =
    settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  const publishableKey =
    settings?.stripePublishableKey ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret =
    settings?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  return Boolean(secretKey && publishableKey && webhookSecret);
}

/** Mask a key for display — shows prefix + stars + last 4 chars. */
export function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 8) + "••••••••" + key.slice(-4);
}

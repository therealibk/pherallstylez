/**
 * Central environment variable validation.
 * Import this in server-side code that needs env vars.
 * Throws at startup if any required variable is missing.
 */

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // Auth
  AUTH_SECRET: requireEnv("AUTH_SECRET"),

  // Application
  NEXT_PUBLIC_APP_URL: optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // Stripe (optional — app degrades gracefully without it)
  STRIPE_SECRET_KEY: optionalEnv("STRIPE_SECRET_KEY"),
  STRIPE_PUBLISHABLE_KEY: optionalEnv("STRIPE_PUBLISHABLE_KEY"),
  STRIPE_WEBHOOK_SECRET: optionalEnv("STRIPE_WEBHOOK_SECRET"),

  // Email (optional — notifications silently skipped)
  RESEND_API_KEY: optionalEnv("RESEND_API_KEY"),
  EMAIL_FROM: optionalEnv("EMAIL_FROM", "noreply@localhost"),
  BUSINESS_EMAIL: optionalEnv("BUSINESS_EMAIL"),

  // Cron
  CRON_SECRET: optionalEnv("CRON_SECRET"),
} as const;

export type Env = typeof env;

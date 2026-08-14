import type { Metadata } from "next";
import { CreditCard, CheckCircle, XCircle } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { isStripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Payment Settings — Pherall Admin",
};

function ConfigRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1.5 text-xs font-medium">
        {configured ? (
          <>
            <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            <span className="text-emerald-700">Configured</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Not set</span>
          </>
        )}
      </span>
    </div>
  );
}

export default function PaymentSettingsPage() {
  const stripeConfigured = isStripeConfigured();
  const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const publishableKeyConfigured = Boolean(process.env.STRIPE_PUBLISHABLE_KEY);
  const allConfigured = stripeConfigured && webhookConfigured && publishableKeyConfigured;

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <PageHeader
        title="Payments"
        description="Stripe integration configuration status."
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Status summary */}
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{
            background: allConfigured ? "#d1fae5" : "#fef3c7",
          }}
        >
          <CreditCard
            className="h-5 w-5 shrink-0"
            style={{ color: allConfigured ? "#065f46" : "#92400e" }}
            aria-hidden="true"
          />
          <div>
            <p
              className="text-sm font-semibold"
              style={{ color: allConfigured ? "#065f46" : "#92400e" }}
            >
              {allConfigured ? "Stripe is ready" : "Stripe setup incomplete"}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: allConfigured ? "#047857" : "#b45309" }}
            >
              {allConfigured
                ? "All required environment variables are configured."
                : "Set the missing environment variables to enable payments."}
            </p>
          </div>
        </div>

        {/* Config rows */}
        <div className="divide-y divide-border px-5">
          <ConfigRow label="STRIPE_SECRET_KEY" configured={stripeConfigured} />
          <ConfigRow label="STRIPE_PUBLISHABLE_KEY" configured={publishableKeyConfigured} />
          <ConfigRow label="STRIPE_WEBHOOK_SECRET" configured={webhookConfigured} />
        </div>
      </div>

      {!allConfigured && (
        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
          Add the missing keys to your <code className="font-mono">.env.local</code> file and
          restart the server. See <code className="font-mono">.env.example</code> for the required
          variable names.
        </p>
      )}

      {allConfigured && (
        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
          Register your webhook endpoint (<code className="font-mono">/api/webhooks/stripe</code>)
          in the Stripe dashboard, listening for{" "}
          <code className="font-mono">checkout.session.completed</code>,{" "}
          <code className="font-mono">payment_intent.payment_failed</code>, and{" "}
          <code className="font-mono">charge.refunded</code>.
        </p>
      )}
    </div>
  );
}

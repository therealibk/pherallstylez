import type { Metadata } from "next";
import { CreditCard, CheckCircle, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { isStripeConfigured } from "@/lib/stripe";
import { getStripeKeyStatus } from "@/lib/actions/stripe-settings";
import { StripeKeysForm } from "./stripe-keys-form";

export const metadata: Metadata = {
  title: "Payment Settings — Pherall Admin",
};

export default async function PaymentSettingsPage() {
  const [allConfigured, keyStatus] = await Promise.all([
    isStripeConfigured(),
    getStripeKeyStatus(),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-8">
      <PageHeader
        title="Payments"
        description="Configure Stripe to accept online payments."
      />

      {/* Status banner */}
      <div
        className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{ background: allConfigured ? "#d1fae5" : "#fef3c7" }}
      >
        <CreditCard
          className="h-5 w-5 shrink-0"
          style={{ color: allConfigured ? "#065f46" : "#92400e" }}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: allConfigured ? "#065f46" : "#92400e" }}>
            {allConfigured ? "Stripe is ready" : "Stripe setup incomplete"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: allConfigured ? "#047857" : "#b45309" }}>
            {allConfigured
              ? "All three keys are configured. Payments are enabled."
              : "Add all three keys below to enable payments."}
          </p>
        </div>
        {allConfigured && <CheckCircle className="h-5 w-5 ml-auto text-emerald-600" aria-hidden="true" />}
      </div>

      {/* Key entry form */}
      <section aria-labelledby="stripe-keys-heading">
        <h2 id="stripe-keys-heading" className="text-base font-semibold mb-1">
          Stripe API Keys
        </h2>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Find your keys in the{" "}
          <a
            href="https://dashboard.stripe.com/test/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-70 transition-opacity inline-flex items-center gap-0.5"
          >
            Stripe Dashboard
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          . Use test keys (<code className="font-mono text-xs">sk_test_</code> /{" "}
          <code className="font-mono text-xs">pk_test_</code>) while testing, switch to live keys
          when going live. Keys saved here take precedence over environment variables.
        </p>

        <div className="rounded-xl border border-border bg-card p-5">
          <StripeKeysForm
            secretKey={{
              maskedValue: keyStatus.secretKey,
              source: keyStatus.secretKeySource,
            }}
            publishableKey={{
              maskedValue: keyStatus.publishableKey,
              source: keyStatus.publishableKeySource,
            }}
            webhookSecret={{
              maskedValue: keyStatus.webhookSecret,
              source: keyStatus.webhookSecretSource,
            }}
          />
        </div>
      </section>

      {/* Webhook instructions */}
      <section aria-labelledby="webhook-heading">
        <h2 id="webhook-heading" className="text-base font-semibold mb-1">
          Webhook Setup
        </h2>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Stripe uses webhooks to notify the app when a payment succeeds or fails. You need to
          register the webhook endpoint in the Stripe dashboard.
        </p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border text-sm">
          <div className="px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Webhook URL
            </p>
            <code className="font-mono text-xs break-all">
              https://your-domain.com/api/webhooks/stripe
            </code>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Events to listen for
            </p>
            <ul className="space-y-1">
              {[
                "checkout.session.completed",
                "payment_intent.payment_failed",
                "charge.refunded",
              ].map((e) => (
                <li key={e}>
                  <code className="font-mono text-xs">{e}</code>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Local testing (Stripe CLI)
            </p>
            <code className="font-mono text-xs block break-all text-muted-foreground">
              stripe listen --forward-to localhost:3000/api/webhooks/stripe
            </code>
            <p className="text-xs text-muted-foreground mt-1">
              Copy the <code className="font-mono">whsec_</code> secret the CLI prints and save it
              above as your Webhook Secret.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

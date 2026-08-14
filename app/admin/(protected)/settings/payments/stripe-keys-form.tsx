"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, Eye, EyeOff, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveStripeKeys, clearStripeKey } from "@/lib/actions/stripe-settings";
import { useRouter } from "next/navigation";

interface KeyStatus {
  maskedValue: string | null;
  source: "db" | "env" | null;
}

interface Props {
  secretKey: KeyStatus;
  publishableKey: KeyStatus;
  webhookSecret: KeyStatus;
}

function SourceBadge({ source }: { source: "db" | "env" | null }) {
  if (!source) return null;
  return (
    <span
      className="ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{
        background: source === "db" ? "#dbeafe" : "#f3f4f6",
        color: source === "db" ? "#1e40af" : "#6b7280",
      }}
    >
      {source === "db" ? "saved" : "env var"}
    </span>
  );
}

function KeyField({
  id,
  label,
  hint,
  placeholder,
  status,
  value,
  onChange,
  onClear,
  clearing,
}: {
  id: string;
  label: string;
  hint: string;
  placeholder: string;
  status: KeyStatus;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  clearing: boolean;
}) {
  const [show, setShow] = useState(false);
  const isSet = Boolean(status.maskedValue);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {isSet ? (
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        )}
        <SourceBadge source={status.source} />
      </div>

      {/* Show masked current value when set and no new value being typed */}
      {isSet && !value && (
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono text-muted-foreground">
            {status.maskedValue}
          </code>
          {status.source === "db" && (
            <button
              type="button"
              onClick={onClear}
              disabled={clearing}
              className="flex items-center gap-1 text-xs text-destructive hover:opacity-70 transition-opacity disabled:opacity-40"
              aria-label={`Clear ${label}`}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSet ? `Leave blank to keep current ${label}` : placeholder}
          autoComplete="off"
          className="pr-9 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Hide key" : "Show key"}
        >
          {show ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function StripeKeysForm({ secretKey, publishableKey, webhookSecret }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clearing, setClearing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [newSecret, setNewSecret] = useState("");
  const [newPublishable, setNewPublishable] = useState("");
  const [newWebhook, setNewWebhook] = useState("");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newSecret && !newPublishable && !newWebhook) {
      setError("Enter at least one key to save.");
      return;
    }
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveStripeKeys(newSecret, newPublishable, newWebhook);
      if (!result.success) {
        setError(result.error);
      } else {
        setSaved(true);
        setNewSecret("");
        setNewPublishable("");
        setNewWebhook("");
        router.refresh();
      }
    });
  }

  async function handleClear(field: "stripeSecretKey" | "stripePublishableKey" | "stripeWebhookSecret") {
    setClearing(field);
    setError(null);
    const result = await clearStripeKey(field);
    if (!result.success) setError(result.error);
    setClearing(null);
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <KeyField
        id="stripe-secret"
        label="Secret Key"
        hint="Starts with sk_test_ or sk_live_. Never exposed to the browser."
        placeholder="sk_test_..."
        status={secretKey}
        value={newSecret}
        onChange={setNewSecret}
        onClear={() => handleClear("stripeSecretKey")}
        clearing={clearing === "stripeSecretKey"}
      />
      <KeyField
        id="stripe-publishable"
        label="Publishable Key"
        hint="Starts with pk_test_ or pk_live_. Safe to expose to the browser."
        placeholder="pk_test_..."
        status={publishableKey}
        value={newPublishable}
        onChange={setNewPublishable}
        onClear={() => handleClear("stripePublishableKey")}
        clearing={clearing === "stripePublishableKey"}
      />
      <KeyField
        id="stripe-webhook"
        label="Webhook Secret"
        hint="Starts with whsec_. From the Stripe dashboard or Stripe CLI."
        placeholder="whsec_..."
        status={webhookSecret}
        value={newWebhook}
        onChange={setNewWebhook}
        onClear={() => handleClear("stripeWebhookSecret")}
        clearing={clearing === "stripeWebhookSecret"}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-emerald-600 font-medium">
          Keys saved successfully.
        </p>
      )}

      <Button type="submit" disabled={isPending} className="gap-2">
        <Save className="h-4 w-4" aria-hidden="true" />
        {isPending ? "Saving…" : "Save keys"}
      </Button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, Eye, EyeOff, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveEmailSettings,
  clearEmailField,
  sendTestEmail,
} from "@/lib/actions/email-settings";
import { useRouter } from "next/navigation";

interface FieldStatus {
  maskedValue: string | null;
  source: "db" | "env" | null;
}

interface Props {
  apiKey: FieldStatus;
  fromAddress: FieldStatus;
  businessEmail: string;
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

export function EmailDeliveryForm({ apiKey, fromAddress, businessEmail }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clearing, setClearing] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [newApiKey, setNewApiKey] = useState("");
  const [newFrom, setNewFrom] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testTo, setTestTo] = useState(businessEmail);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!newApiKey && !newFrom) {
      setError("Enter at least one value to save.");
      return;
    }
    setError(null);
    setSaved(false);
    setTestResult(null);
    startTransition(async () => {
      const result = await saveEmailSettings(newApiKey, newFrom);
      if (!result.success) {
        setError(result.error);
      } else {
        setSaved(true);
        setNewApiKey("");
        setNewFrom("");
        router.refresh();
      }
    });
  }

  async function handleClear(field: "resendApiKey" | "emailFrom") {
    setClearing(field);
    setError(null);
    setTestResult(null);
    const result = await clearEmailField(field);
    if (!result.success) setError(result.error);
    setClearing(null);
    router.refresh();
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setTestResult(null);
    const result = await sendTestEmail(testTo);
    setTesting(false);
    if (result.success) {
      setTestResult({ ok: true, msg: `Test email sent to ${testTo}` });
    } else {
      setTestResult({ ok: false, msg: result.error });
    }
  }

  const apiKeySet = Boolean(apiKey.maskedValue);
  const fromSet = Boolean(fromAddress.maskedValue);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-5">
        {/* API Key */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Label htmlFor="resend-api-key" className="text-sm font-medium">
              Resend API Key
            </Label>
            {apiKeySet ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <SourceBadge source={apiKey.source} />
          </div>
          {apiKeySet && !newApiKey && (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono text-muted-foreground">
                {apiKey.maskedValue}
              </code>
              {apiKey.source === "db" && (
                <button
                  type="button"
                  onClick={() => handleClear("resendApiKey")}
                  disabled={clearing === "resendApiKey"}
                  className="flex items-center gap-1 text-xs text-destructive hover:opacity-70 transition-opacity disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          )}
          <div className="relative">
            <Input
              id="resend-api-key"
              type={showKey ? "text" : "password"}
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder={apiKeySet ? "Leave blank to keep current key" : "re_xxxxxxxxxxxxxxxxxxxx"}
              autoComplete="off"
              className="pr-9 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your key from{" "}
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70"
            >
              resend.com/api-keys
            </a>
            . Starts with <code className="font-mono text-xs">re_</code>.
          </p>
        </div>

        {/* From address */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Label htmlFor="email-from" className="text-sm font-medium">
              From Address
            </Label>
            {fromSet ? (
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <SourceBadge source={fromAddress.source} />
          </div>
          {fromSet && !newFrom && (
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono text-muted-foreground">
                {fromAddress.maskedValue}
              </code>
              {fromAddress.source === "db" && (
                <button
                  type="button"
                  onClick={() => handleClear("emailFrom")}
                  disabled={clearing === "emailFrom"}
                  className="flex items-center gap-1 text-xs text-destructive hover:opacity-70 transition-opacity disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>
          )}
          <Input
            id="email-from"
            type="email"
            value={newFrom}
            onChange={(e) => setNewFrom(e.target.value)}
            placeholder={fromSet ? "Leave blank to keep current address" : "noreply@yourdomain.com"}
            autoComplete="off"
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Must be a domain you&apos;ve verified in Resend.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-emerald-600 font-medium">
            Email settings saved.
          </p>
        )}

        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? "Saving…" : "Save"}
        </Button>
      </form>

      {/* Test email */}
      <div className="border-t border-border pt-5 space-y-3">
        <p className="text-sm font-medium">Send a test email</p>
        <p className="text-xs text-muted-foreground">
          Verify your API key and from address are working.
        </p>
        <div className="flex gap-2">
          <Input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="recipient@example.com"
            className="text-sm flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleTest}
            disabled={testing || !apiKeySet}
            className="gap-2 shrink-0"
          >
            <Send className="h-4 w-4" />
            {testing ? "Sending…" : "Send test"}
          </Button>
        </div>
        {!apiKeySet && (
          <p className="text-xs text-muted-foreground">Save an API key first to send a test.</p>
        )}
        {testResult && (
          <p
            role="status"
            className={`text-sm font-medium ${testResult.ok ? "text-emerald-600" : "text-destructive"}`}
          >
            {testResult.msg}
          </p>
        )}
      </div>
    </div>
  );
}

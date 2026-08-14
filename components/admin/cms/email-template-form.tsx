"use client";

import { useState, useTransition } from "react";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { saveEmailTemplate, previewEmailTemplate, sendTestEmail } from "@/lib/actions/email-templates";
import type { NotificationType } from "@/lib/generated/prisma/client";
import { EMAIL_TEMPLATE_VARIABLES } from "@/lib/email-templates";

interface Props {
  type: NotificationType;
  initialSubject: string;
  initialBody: string;
  initialActive: boolean;
}

export function EmailTemplateForm({
  type,
  initialSubject,
  initialBody,
  initialActive,
}: Props) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [active, setActive] = useState(initialActive);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [isSaving, startSave] = useTransition();
  const [isPreviewing, startPreview] = useTransition();
  const [isTesting, startTest] = useTransition();

  const variables = EMAIL_TEMPLATE_VARIABLES[type] ?? [];

  function handleSave() {
    setSaveMsg(null);
    startSave(async () => {
      const result = await saveEmailTemplate({ type, subject, body, active });
      setSaveMsg(result.success ? { ok: true, text: "Template saved." } : { ok: false, text: result.error });
    });
  }

  function handlePreview() {
    setShowPreview(false);
    startPreview(async () => {
      const result = await previewEmailTemplate(type, subject, body);
      if (result.success) {
        setPreviewHtml(result.html);
        setPreviewSubject(result.subject);
        setShowPreview(true);
      } else {
        setSaveMsg({ ok: false, text: result.error });
      }
    });
  }

  function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    setTestMsg(null);
    startTest(async () => {
      const result = await sendTestEmail({ type, subject, body, testEmail });
      setTestMsg(result.success ? { ok: true, text: "Test email sent." } : { ok: false, text: result.error });
    });
  }

  return (
    <div className="space-y-6">
      {/* Active toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            Use this template
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            When off, the system uses the built-in default template instead.
          </p>
        </div>
        <Switch
          checked={active}
          onCheckedChange={setActive}
          aria-label="Use this template"
        />
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="email-subject">Subject line</Label>
        <Input
          id="email-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Your appointment is confirmed — {{service_name}}"
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="font-mono bg-muted px-1 rounded">{"{{variable_name}}"}</code> placeholders — they will be replaced when the email is sent.
        </p>
      </div>

      {/* Body */}
      <div className="space-y-2">
        <Label>Body</Label>
        <div className="rounded-xl border border-border overflow-hidden">
          <RichTextEditor
            value={body}
            onChange={setBody}
            placeholder="Write the email body here. Use {{variable_name}} for dynamic content."
          />
        </div>
      </div>

      {/* Variable reference */}
      <details className="rounded-xl border border-border bg-card overflow-hidden">
        <summary className="px-5 py-3 text-sm font-medium cursor-pointer hover:bg-muted/30 transition-colors select-none">
          Available variables for this template
        </summary>
        <div className="px-5 pb-4 pt-2 border-t border-border">
          <div className="flex flex-wrap gap-2">
            {variables.map((v) => (
              <code
                key={v}
                className="text-xs font-mono bg-muted px-2 py-1 rounded border border-border text-muted-foreground"
              >
                {v}
              </code>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Copy and paste these into your subject or body. Unknown placeholders are left unchanged.
          </p>
        </div>
      </details>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isPreviewing || isTesting}
          className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          {isSaving ? "Saving…" : "Save template"}
        </button>
        <button
          type="button"
          onClick={handlePreview}
          disabled={isSaving || isPreviewing || isTesting}
          className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold border border-border transition-colors hover:bg-muted disabled:opacity-40"
        >
          {isPreviewing ? "Generating…" : "Preview"}
        </button>
        {saveMsg && (
          <p
            className={`text-sm ${saveMsg.ok ? "text-green-600" : "text-destructive"}`}
            role="status"
          >
            {saveMsg.text}
          </p>
        )}
      </div>

      {/* Preview */}
      {showPreview && previewHtml && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Preview (sample data)</h3>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Hide preview
            </button>
          </div>
          {previewSubject && (
            <p className="text-sm">
              <span className="text-muted-foreground">Subject: </span>
              <span className="font-medium">{previewSubject}</span>
            </p>
          )}
          <div className="rounded-xl border border-border overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              title="Email preview"
              className="w-full"
              style={{ height: "600px", border: "none" }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Test send */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Send test email</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Uses sample data. Requires a Resend API key (Admin → Settings → Notifications).
          </p>
        </div>
        <form onSubmit={handleSendTest} className="px-5 py-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48 space-y-1.5">
            <Label htmlFor="test-email">Test email address</Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSaving || isPreviewing || isTesting || !testEmail}
            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold border border-border transition-colors hover:bg-muted disabled:opacity-40"
          >
            {isTesting ? "Sending…" : "Send test"}
          </button>
          {testMsg && (
            <p
              className={`text-sm w-full ${testMsg.ok ? "text-green-600" : "text-destructive"}`}
              role="status"
            >
              {testMsg.text}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition, useRef } from "react";
import { saveAppearanceSettings, uploadLogoImage, uploadFaviconImage } from "@/lib/actions/appearance";
import {
  ALLOWED_FONTS,
  FONT_LABELS,
  PUBLIC_COLOR_VAR_NAMES,
  COLOR_LABELS,
  type ColorVarName,
  type AppearanceColors,
  type FontKey,
} from "@/lib/appearance-schemas";

const ADMIN_COLOR_VAR_NAMES: ColorVarName[] = ["--admin-sidebar"];

interface Props {
  initialColors: AppearanceColors;
  initialFont: FontKey;
  initialLogoUrl: string | null;
  initialFaviconUrl: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveRow({ state, error }: { state: SaveState; error: string }) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="submit"
        disabled={state === "saving"}
        className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 transition-opacity hover:opacity-85"
      >
        {state === "saving" ? "Saving…" : "Save changes"}
      </button>
      {state === "saved" && (
        <span className="text-sm text-green-600 font-medium">Saved.</span>
      )}
      {state === "error" && (
        <span className="text-sm text-destructive">{error}</span>
      )}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      <h2 className="font-semibold text-base">{title}</h2>
      {children}
    </div>
  );
}

function ImageUploadField({
  label,
  currentUrl,
  onUpload,
  accept = "image/jpeg,image/png,image/webp",
  hint,
}: {
  label: string;
  currentUrl: string | null;
  onUpload: (formData: FormData) => Promise<{ success: boolean; error?: string; url?: string }>;
  accept?: string;
  hint?: string;
}) {
  const [url, setUrl] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.set("file", file);

    const result = await onUpload(formData);

    setUploading(false);
    if (result.success && result.url) {
      setUrl(result.url);
    } else {
      setError(result.error ?? "Upload failed");
    }

    // Reset input so the same file can be re-selected if needed
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <div className="flex items-start gap-4">
        {url ? (
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              className="h-16 w-auto max-w-[120px] object-contain rounded border bg-muted/20 p-1"
            />
          </div>
        ) : (
          <div className="h-16 w-16 rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground shrink-0">
            None
          </div>
        )}

        <div className="space-y-1.5">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleChange}
            disabled={uploading}
            className="block text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:cursor-pointer cursor-pointer disabled:opacity-50"
          />
          {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export function AppearanceForm({
  initialColors,
  initialFont,
  initialLogoUrl,
  initialFaviconUrl,
}: Props) {
  const [colors, setColors] = useState<AppearanceColors>(initialColors);
  const [font, setFont] = useState<FontKey>(initialFont);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentSaveState: SaveState = isPending ? "saving" : saveState;

  function setColor(varName: string, value: string) {
    setColors((prev) => ({ ...prev, [varName]: value }));
    setSaveState("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");

    startTransition(async () => {
      const result = await saveAppearanceSettings({ colors, font });
      if (result.success) {
        setSaveState("saved");
      } else {
        setSaveState("error");
        setSaveError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Public site colours */}
      <SectionCard title="Brand Colours">
        <p className="text-sm text-muted-foreground">
          Choose colours for your public website.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PUBLIC_COLOR_VAR_NAMES.map((varName) => (
            <div key={varName} className="flex items-center gap-3">
              <input
                type="color"
                value={colors[varName]}
                onChange={(e) => setColor(varName, e.target.value)}
                className="h-9 w-9 rounded border cursor-pointer bg-transparent p-0.5"
                aria-label={COLOR_LABELS[varName]}
              />
              <div className="min-w-0">
                <label className="block text-sm font-medium leading-none mb-1">
                  {COLOR_LABELS[varName]}
                </label>
                <input
                  type="text"
                  value={colors[varName]}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(varName, v);
                  }}
                  maxLength={7}
                  className="w-24 rounded border bg-muted/30 px-2 py-1 text-xs font-mono"
                  aria-label={`${COLOR_LABELS[varName]} hex value`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-4 border-t">
          <SaveRow state={currentSaveState} error={saveError} />
        </div>
      </SectionCard>

      {/* Admin dashboard colours */}
      <SectionCard title="Admin Dashboard">
        <p className="text-sm text-muted-foreground">
          Customise the colour of the admin sidebar.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {ADMIN_COLOR_VAR_NAMES.map((varName) => (
            <div key={varName} className="flex items-center gap-3">
              <input
                type="color"
                value={colors[varName]}
                onChange={(e) => setColor(varName, e.target.value)}
                className="h-9 w-9 rounded border cursor-pointer bg-transparent p-0.5"
                aria-label={COLOR_LABELS[varName]}
              />
              <div className="min-w-0">
                <label className="block text-sm font-medium leading-none mb-1">
                  {COLOR_LABELS[varName]}
                </label>
                <input
                  type="text"
                  value={colors[varName]}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(varName, v);
                  }}
                  maxLength={7}
                  className="w-24 rounded border bg-muted/30 px-2 py-1 text-xs font-mono"
                  aria-label={`${COLOR_LABELS[varName]} hex value`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-4 border-t">
          <SaveRow state={currentSaveState} error={saveError} />
        </div>
      </SectionCard>

      {/* Typography */}
      <SectionCard title="Typography">
        <div className="space-y-2">
          <label htmlFor="font-select" className="block text-sm font-medium">
            Body font
          </label>
          <select
            id="font-select"
            value={font}
            onChange={(e) => {
              setFont(e.target.value as FontKey);
              setSaveState("idle");
            }}
            className="rounded-md border bg-background px-3 py-2 text-sm w-full max-w-xs"
          >
            {ALLOWED_FONTS.map((key) => (
              <option key={key} value={key}>
                {FONT_LABELS[key]}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Applies to all text on the public site. Headings inherit the same typeface.
          </p>
        </div>

        <div className="pt-2 border-t">
          <SaveRow state={currentSaveState} error={saveError} />
        </div>
      </SectionCard>

      {/* Logo */}
      <SectionCard title="Logo">
        <ImageUploadField
          label="Site logo"
          currentUrl={initialLogoUrl}
          onUpload={uploadLogoImage}
          hint="Appears in the site header. JPEG, PNG, or WebP. Max 512 KB."
        />
      </SectionCard>

      {/* Favicon */}
      <SectionCard title="Favicon">
        <ImageUploadField
          label="Favicon"
          currentUrl={initialFaviconUrl || null}
          onUpload={uploadFaviconImage}
          hint="Square icon shown in browser tabs. PNG recommended. Max 256 KB."
        />
        <p className="text-xs text-muted-foreground">
          After uploading, add a{" "}
          <code className="text-xs bg-muted px-1 rounded">favicon.ico</code> or update your{" "}
          <code className="text-xs bg-muted px-1 rounded">app/layout.tsx</code> metadata
          to reference the uploaded URL.
        </p>
      </SectionCard>

      {/* Preview link */}
      <div className="flex items-center gap-4 pt-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Preview public site ↗
        </a>
        <span className="text-xs text-muted-foreground">Opens in a new tab after saving.</span>
      </div>
    </form>
  );
}

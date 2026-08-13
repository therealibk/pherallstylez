"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  saveHeroSection,
  saveHomepageAboutSection,
  saveCtaSection,
} from "@/lib/actions/cms";
import { uploadCmsImage } from "@/lib/actions/appearance";
import type {
  HeroData,
  HomepageAboutSectionData,
  CtaData,
} from "@/lib/cms-schemas";

function SaveRow({
  isPending,
  saved,
  error,
  label,
}: {
  isPending: boolean;
  saved: boolean;
  error: string | null;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 pt-2">
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : label}
      </Button>
      {saved && (
        <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>
      )}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}

function ImageUploadField({
  label,
  currentUrl,
  onUrlChange,
  hint,
  uploadType,
}: {
  label: string;
  currentUrl: string;
  onUrlChange: (url: string) => void;
  hint?: string;
  uploadType: "hero" | "about";
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadCmsImage(formData, uploadType);
    setUploading(false);

    if (result.success) {
      onUrlChange(result.url);
    } else {
      setUploadError(result.error);
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <div className="flex items-start gap-4">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt=""
            aria-hidden="true"
            className="h-20 w-auto max-w-[140px] object-cover rounded border shrink-0"
          />
        ) : (
          <div className="h-16 w-24 rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground shrink-0">
            No image
          </div>
        )}

        <div className="space-y-1.5 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            className="block text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:cursor-pointer cursor-pointer disabled:opacity-50"
          />
          {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
          {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
          {currentUrl && (
            <button
              type="button"
              onClick={() => onUrlChange("")}
              className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2"
            >
              Remove image
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

export function HeroForm({ initial }: { initial: HeroData }) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof Pick<HeroData, "heading" | "description" | "buttonText">) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setData((d) => ({ ...d, [key]: e.target.value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await saveHeroSection(data);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Section</CardTitle>
        <p className="text-sm text-muted-foreground">
          The banner visitors see first on your homepage.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hero-heading">Heading</Label>
            <Input
              id="hero-heading"
              value={data.heading}
              onChange={field("heading")}
              placeholder="Your main headline"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hero-description">Description</Label>
            <Textarea
              id="hero-description"
              value={data.description}
              onChange={field("description")}
              placeholder="Short tagline or sub-heading"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hero-button">Book Button Text</Label>
            <Input
              id="hero-button"
              value={data.buttonText}
              onChange={field("buttonText")}
              placeholder="Book Now"
            />
          </div>
          <ImageUploadField
            label="Hero Image (optional)"
            currentUrl={data.imageUrl}
            onUrlChange={(url) => setData((d) => ({ ...d, imageUrl: url }))}
            hint="Displayed behind your headline. JPEG, PNG, or WebP. Max 2 MB."
            uploadType="hero"
          />
          <SaveRow isPending={isPending} saved={saved} error={error} label="Save Hero" />
        </form>
      </CardContent>
    </Card>
  );
}

// ── About Section ─────────────────────────────────────────────────────────────

export function HomepageAboutSectionForm({
  initial,
}: {
  initial: HomepageAboutSectionData;
}) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof Pick<HomepageAboutSectionData, "heading" | "description" | "buttonText">) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setData((d) => ({ ...d, [key]: e.target.value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await saveHomepageAboutSection(data);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>About Teaser</CardTitle>
        <p className="text-sm text-muted-foreground">
          A brief introduction to you or your salon shown on the homepage.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ha-heading">Heading</Label>
            <Input
              id="ha-heading"
              value={data.heading}
              onChange={field("heading")}
              placeholder="About Us"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ha-description">Description</Label>
            <Textarea
              id="ha-description"
              value={data.description}
              onChange={field("description")}
              placeholder="A short paragraph about your work"
              rows={4}
            />
          </div>
          <ImageUploadField
            label="About Image (optional)"
            currentUrl={data.imageUrl}
            onUrlChange={(url) => setData((d) => ({ ...d, imageUrl: url }))}
            hint="Shown alongside your about text. JPEG, PNG, or WebP. Max 2 MB."
            uploadType="about"
          />
          <div className="space-y-1.5">
            <Label htmlFor="ha-button">Button Text</Label>
            <Input
              id="ha-button"
              value={data.buttonText}
              onChange={field("buttonText")}
              placeholder="Learn More"
            />
          </div>
          <SaveRow
            isPending={isPending}
            saved={saved}
            error={error}
            label="Save About Teaser"
          />
        </form>
      </CardContent>
    </Card>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

export function CtaForm({ initial }: { initial: CtaData }) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof CtaData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setData((d) => ({ ...d, [key]: e.target.value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await saveCtaSection(data);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Call to Action</CardTitle>
        <p className="text-sm text-muted-foreground">
          The booking prompt shown at the bottom of your homepage.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cta-heading">Heading</Label>
            <Input
              id="cta-heading"
              value={data.heading}
              onChange={field("heading")}
              placeholder="Ready to book?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cta-description">Description</Label>
            <Textarea
              id="cta-description"
              value={data.description}
              onChange={field("description")}
              placeholder="Invite visitors to make an appointment"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cta-button">Button Text</Label>
            <Input
              id="cta-button"
              value={data.buttonText}
              onChange={field("buttonText")}
              placeholder="Book an Appointment"
            />
          </div>
          <SaveRow isPending={isPending} saved={saved} error={error} label="Save CTA" />
        </form>
      </CardContent>
    </Card>
  );
}

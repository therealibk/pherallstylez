"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveAboutPageContent } from "@/lib/actions/cms";
import { uploadCmsImage } from "@/lib/actions/appearance";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import type { AboutPageData } from "@/lib/cms-schemas";

function AboutImageUpload({
  currentUrl,
  onUrlChange,
}: {
  currentUrl: string;
  onUrlChange: (url: string) => void;
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

    const result = await uploadCmsImage(formData, "about");
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
      <Label>Profile Photo (optional)</Label>
      <p className="text-xs text-muted-foreground">
        Shown on your about page. JPEG, PNG, or WebP. Max 2 MB.
      </p>
      <div className="flex items-start gap-4">
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt=""
            aria-hidden="true"
            className="h-20 w-auto max-w-[120px] object-cover rounded border shrink-0"
          />
        ) : (
          <div className="h-16 w-24 rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground shrink-0">
            No photo
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
              Remove photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AboutForm({ initial }: { initial: AboutPageData }) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof Pick<AboutPageData, "heading" | "ctaHeading" | "ctaDescription" | "ctaButtonText">) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setData((d) => ({ ...d, [key]: e.target.value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await saveAboutPageContent(data);
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
        <CardTitle>About Page Content</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-6">
          {/* Page heading */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Page Heading</legend>
            <div className="space-y-1.5">
              <Label htmlFor="about-heading">Heading</Label>
              <Input
                id="about-heading"
                value={data.heading}
                onChange={field("heading")}
                placeholder="About Me"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Introduction</Label>
              <RichTextEditor
                value={data.introduction}
                onChange={(val) => setData((d) => ({ ...d, introduction: val }))}
                placeholder="A short introduction paragraph shown at the top"
                minHeight={200}
              />
            </div>
          </fieldset>

          {/* Biography */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Biography</legend>
            <div className="space-y-1.5">
              <Label>Biography</Label>
              <RichTextEditor
                value={data.biography}
                onChange={(val) => setData((d) => ({ ...d, biography: val }))}
                placeholder="Your full story — training, experience, passion for hair…"
                minHeight={300}
              />
            </div>
            <AboutImageUpload
              currentUrl={data.imageUrl}
              onUrlChange={(url) => setData((d) => ({ ...d, imageUrl: url }))}
            />
          </fieldset>

          {/* CTA */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Call to Action</legend>
            <div className="space-y-1.5">
              <Label htmlFor="about-cta-heading">CTA Heading</Label>
              <Input
                id="about-cta-heading"
                value={data.ctaHeading}
                onChange={field("ctaHeading")}
                placeholder="Ready to work together?"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="about-cta-desc">CTA Description</Label>
              <Textarea
                id="about-cta-desc"
                value={data.ctaDescription}
                onChange={field("ctaDescription")}
                placeholder="Encourage visitors to book"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="about-cta-btn">Button Text</Label>
              <Input
                id="about-cta-btn"
                value={data.ctaButtonText}
                onChange={field("ctaButtonText")}
                placeholder="Book an Appointment"
              />
            </div>
          </fieldset>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save About Page"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400">Saved.</span>
            )}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

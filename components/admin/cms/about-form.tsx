"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveAboutPageContent } from "@/lib/actions/cms";
import type { AboutPageData } from "@/lib/cms-schemas";

export function AboutForm({ initial }: { initial: AboutPageData }) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof AboutPageData) {
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
      <CardContent className="pt-6">
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
              <Label htmlFor="about-intro">Introduction</Label>
              <Textarea
                id="about-intro"
                value={data.introduction}
                onChange={field("introduction")}
                placeholder="A short introduction paragraph shown at the top"
                rows={3}
              />
            </div>
          </fieldset>

          {/* Biography */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Biography</legend>
            <div className="space-y-1.5">
              <Label htmlFor="about-bio">Biography</Label>
              <Textarea
                id="about-bio"
                value={data.biography}
                onChange={field("biography")}
                placeholder="Your full story — training, experience, passion for hair…"
                rows={8}
                className="min-h-[200px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="about-image">
                Photo URL
                <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="about-image"
                value={data.imageUrl}
                onChange={field("imageUrl")}
                placeholder="https://example.com/your-photo.jpg"
              />
            </div>
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

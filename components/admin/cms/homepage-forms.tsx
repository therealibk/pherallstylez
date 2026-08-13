"use client";

import { useState, useTransition } from "react";
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

// ── Hero ──────────────────────────────────────────────────────────────────────

export function HeroForm({ initial }: { initial: HeroData }) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof HeroData) {
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
          <div className="space-y-1.5">
            <Label htmlFor="hero-image">
              Hero Image URL
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="hero-image"
              value={data.imageUrl}
              onChange={field("imageUrl")}
              placeholder="https://example.com/image.jpg"
            />
          </div>
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

  function field(key: keyof HomepageAboutSectionData) {
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
          <div className="space-y-1.5">
            <Label htmlFor="ha-image">
              Image URL
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="ha-image"
              value={data.imageUrl}
              onChange={field("imageUrl")}
              placeholder="https://example.com/photo.jpg"
            />
          </div>
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

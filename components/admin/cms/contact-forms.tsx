"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveContactPageCopy, saveBusinessContact } from "@/lib/actions/cms";
import type { ContactPageData, BusinessContactData } from "@/lib/cms-schemas";

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

// ── Page Copy ─────────────────────────────────────────────────────────────────

export function ContactPageCopyForm({ initial }: { initial: ContactPageData }) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof ContactPageData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setData((d) => ({ ...d, [key]: e.target.value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await saveContactPageCopy(data);
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
        <CardTitle>Page Copy</CardTitle>
        <p className="text-sm text-muted-foreground">
          The heading and introduction shown at the top of the contact page.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact-heading">Heading</Label>
            <Input
              id="contact-heading"
              value={data.heading}
              onChange={field("heading")}
              placeholder="Get in Touch"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-intro">Introduction</Label>
            <Textarea
              id="contact-intro"
              value={data.introduction}
              onChange={field("introduction")}
              placeholder="A friendly paragraph inviting visitors to reach out"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-hours">
              Opening Hours
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="contact-hours"
              value={data.openingHours}
              onChange={field("openingHours")}
              placeholder={"Monday – Friday: 9 am – 7 pm\nSaturday: 9 am – 5 pm\nSunday: Closed"}
              rows={4}
            />
          </div>
          <SaveRow
            isPending={isPending}
            saved={saved}
            error={error}
            label="Save Page Copy"
          />
        </form>
      </CardContent>
    </Card>
  );
}

// ── Business Contact Details ──────────────────────────────────────────────────

export function BusinessContactForm({ initial }: { initial: BusinessContactData }) {
  const [data, setData] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field(key: keyof BusinessContactData) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setData((d) => ({ ...d, [key]: e.target.value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await saveBusinessContact(data);
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
        <CardTitle>Contact Details</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your business email, phone, address, and social media links.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="biz-email">Email</Label>
              <Input
                id="biz-email"
                type="email"
                value={data.email}
                onChange={field("email")}
                placeholder="hello@yoursalon.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="biz-phone">
                Phone
                <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="biz-phone"
                type="tel"
                value={data.phone}
                onChange={field("phone")}
                placeholder="+44 7700 900 000"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-address">
              Address
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="biz-address"
              value={data.address}
              onChange={field("address")}
              placeholder="123 High Street, London, UK"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-instagram">
              Instagram URL
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="biz-instagram"
              value={data.instagramUrl}
              onChange={field("instagramUrl")}
              placeholder="https://instagram.com/yoursalon"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-tiktok">
              TikTok URL
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="biz-tiktok"
              value={data.tiktokUrl}
              onChange={field("tiktokUrl")}
              placeholder="https://tiktok.com/@yoursalon"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="biz-facebook">
              Facebook URL
              <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="biz-facebook"
              value={data.facebookUrl}
              onChange={field("facebookUrl")}
              placeholder="https://facebook.com/yoursalon"
            />
          </div>
          <SaveRow
            isPending={isPending}
            saved={saved}
            error={error}
            label="Save Contact Details"
          />
        </form>
      </CardContent>
    </Card>
  );
}

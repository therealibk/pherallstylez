"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveSeoSettings } from "@/lib/actions/booking-settings";

interface Props {
  initialTitle: string;
  initialDescription: string;
}

export function SeoForm({ initialTitle, initialDescription }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const state = isPending ? "saving" : saveState;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await saveSeoSettings({ seoTitle: title, seoDescription: description });
      if (result.success) {
        setSaveState("saved");
      } else {
        setSaveState("error");
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO &amp; Meta Tags</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Controls the title and description shown in Google search results and when your
            site is shared on social media. Leave blank to use the defaults.
          </p>

          <div className="space-y-2">
            <Label htmlFor="seo-title">Page title</Label>
            <Input
              id="seo-title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSaveState("idle"); }}
              placeholder="e.g. Pherall — Professional Hair Styling in London"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/120 characters — aim for 50–70 for best results in search.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo-description">Meta description</Label>
            <Textarea
              id="seo-description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setSaveState("idle"); }}
              placeholder="e.g. Book professional hair styling and braiding services online. Located in London."
              maxLength={320}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/320 characters — aim for 150–160 for best results in search.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={state === "saving"}>
              {state === "saving" ? "Saving…" : "Save"}
            </Button>
            {state === "saved" && <span className="text-sm text-green-600 font-medium">Saved.</span>}
            {state === "error" && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

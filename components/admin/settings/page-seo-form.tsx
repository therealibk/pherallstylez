"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { savePageSeo, type PageKey } from "@/lib/actions/page-seo";

interface PageDef {
  key: PageKey;
  label: string;
  defaultTitle: string;
  defaultDescription: string;
}

const PAGES: PageDef[] = [
  {
    key: "home",
    label: "Home",
    defaultTitle: "Pherall — Professional Hair Styling",
    defaultDescription: "Professional hair styling and beauty services. Book your appointment online.",
  },
  {
    key: "services",
    label: "Services",
    defaultTitle: "Services — Pherall",
    defaultDescription: "Browse all available hair styling services and book your appointment online.",
  },
  {
    key: "about",
    label: "About",
    defaultTitle: "About — Pherall",
    defaultDescription: "",
  },
  {
    key: "contact",
    label: "Contact",
    defaultTitle: "Contact — Pherall",
    defaultDescription: "",
  },
  {
    key: "faq",
    label: "FAQ",
    defaultTitle: "FAQ — Pherall",
    defaultDescription: "",
  },
];

interface Props {
  initial: Record<PageKey, { title: string | null; description: string | null }>;
}

function PageSeoCard({
  page,
  initial,
}: {
  page: PageDef;
  initial: { title: string | null; description: string | null };
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const status = isPending ? "saving" : state;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await savePageSeo(page.key, { title, description });
      if (result.success) {
        setState("saved");
      } else {
        setState("error");
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{page.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`title-${page.key}`}>Page title</Label>
            <Input
              id={`title-${page.key}`}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setState("idle"); }}
              placeholder={page.defaultTitle}
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/120 — leave blank to use the default: &ldquo;{page.defaultTitle}&rdquo;
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`desc-${page.key}`}>Meta description</Label>
            <Textarea
              id={`desc-${page.key}`}
              value={description}
              onChange={(e) => { setDescription(e.target.value); setState("idle"); }}
              placeholder={page.defaultDescription || "Describe this page for search engines…"}
              maxLength={320}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/320 — aim for 150–160 characters.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" size="sm" disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : "Save"}
            </Button>
            {status === "saved" && (
              <span className="text-sm text-green-600 font-medium">Saved.</span>
            )}
            {status === "error" && (
              <span className="text-sm text-destructive">{error}</span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PageSeoForm({ initial }: Props) {
  return (
    <div className="space-y-6">
      {PAGES.map((page) => (
        <PageSeoCard key={page.key} page={page} initial={initial[page.key]} />
      ))}
    </div>
  );
}

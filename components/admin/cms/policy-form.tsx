"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { savePolicy } from "@/lib/actions/policy";

interface PolicyRecord {
  type: string;
  title: string;
  content: string;
  version: number;
  published: boolean;
}

export function PolicyForm({ policy }: { policy: PolicyRecord }) {
  const [title, setTitle] = useState(policy.title);
  const [content, setContent] = useState(policy.content);
  const [published, setPublished] = useState(policy.published);
  const [currentVersion, setCurrentVersion] = useState(policy.version);

  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentChanged = content !== policy.content;
  const willVersionBump = contentChanged && policy.published;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await savePolicy(policy.type, { title, content, published });
      if (result.success) {
        setCurrentVersion(result.version);
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
        <form onSubmit={submit} className="space-y-5">
          {/* Version badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline">Version {currentVersion}</Badge>
            <Badge variant={published ? "success" : "secondary"}>
              {published ? "Published" : "Draft"}
            </Badge>
            {willVersionBump && (
              <Badge variant="default" className="bg-amber-500 text-white">
                Saving will bump to v{policy.version + 1}
              </Badge>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="policy-title">Title</Label>
            <Input
              id="policy-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Content</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Enter policy content here…"
              minHeight="400px"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="policy-published"
              checked={published}
              onCheckedChange={setPublished}
            />
            <Label htmlFor="policy-published" className="cursor-pointer">
              Publish this policy
            </Label>
          </div>
          {published && (
            <p className="text-xs text-muted-foreground -mt-2">
              Published policies are visible on the public website and shown to
              clients during booking.
            </p>
          )}

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save Policy"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600 dark:text-green-400">
                Saved (v{currentVersion}).
              </span>
            )}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

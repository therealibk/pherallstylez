"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveTestimonials } from "@/lib/actions/cms";
import type { TestimonialItem } from "@/lib/cms-schemas";

interface Props {
  initial: TestimonialItem[];
}

type EditState = {
  name: string;
  quote: string;
  role: string;
  published: boolean;
};

const emptyEdit: EditState = { name: "", quote: "", role: "", published: false };

export function HomepageTestimonialsManager({ initial }: Props) {
  const [items, setItems] = useState<TestimonialItem[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<EditState>(emptyEdit);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState>(emptyEdit);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function persist(updated: TestimonialItem[]) {
    setError(null);
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await saveTestimonials(updated);
        if (!result.success) setError(result.error);
        resolve(result.success);
      });
    });
  }

  function startEdit(item: TestimonialItem) {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      quote: item.quote,
      role: item.role,
      published: item.published,
    });
    setDeletingId(null);
  }

  async function commitEdit() {
    if (!editingId) return;
    if (!editForm.name.trim() || !editForm.quote.trim()) return;
    const updated = items.map((item) =>
      item.id === editingId ? { ...item, ...editForm } : item,
    );
    if (await persist(updated)) {
      setItems(updated);
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    const updated = items.filter((item) => item.id !== id);
    if (await persist(updated)) {
      setItems(updated);
      setDeletingId(null);
    }
  }

  async function togglePublished(id: string) {
    const updated = items.map((item) =>
      item.id === id ? { ...item, published: !item.published } : item,
    );
    if (await persist(updated)) setItems(updated);
  }

  async function handleAdd() {
    setAddError(null);
    if (!addForm.name.trim()) { setAddError("Name is required."); return; }
    if (!addForm.quote.trim()) { setAddError("Quote is required."); return; }

    const newItem: TestimonialItem = {
      id: crypto.randomUUID(),
      name: addForm.name.trim(),
      quote: addForm.quote.trim(),
      role: addForm.role.trim(),
      published: addForm.published,
      displayOrder: items.length,
    };
    const updated = [...items, newItem];
    if (await persist(updated)) {
      setItems(updated);
      setAddForm(emptyEdit);
      setShowAdd(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Testimonials</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Client testimonials shown on your homepage.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setShowAdd((v) => !v); setAddError(null); }}
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Add form */}
        {showAdd && (
          <div className="rounded-md border p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">New Testimonial</p>
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Client Name</Label>
              <Input
                id="new-name"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-quote">Quote</Label>
              <Textarea
                id="new-quote"
                value={addForm.quote}
                onChange={(e) => setAddForm((f) => ({ ...f, quote: e.target.value }))}
                placeholder="What the client said…"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-role">
                Role / Description
                <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="new-role"
                value={addForm.role}
                onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="Regular client"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="new-published"
                checked={addForm.published}
                onCheckedChange={(v) => setAddForm((f) => ({ ...f, published: v }))}
              />
              <Label htmlFor="new-published" className="cursor-pointer">
                Publish immediately
              </Label>
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleAdd} disabled={isPending}>
                {isPending ? "Saving…" : "Add Testimonial"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setShowAdd(false); setAddError(null); setAddForm(emptyEdit); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {items.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No testimonials yet. Add one above.
          </p>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-md border p-4 space-y-3"
          >
            {editingId === item.id ? (
              // Edit mode
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Client Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Quote</Label>
                  <Textarea
                    value={editForm.quote}
                    onChange={(e) => setEditForm((f) => ({ ...f, quote: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role / Description</Label>
                  <Input
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    placeholder="Regular client"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.published}
                    onCheckedChange={(v) => setEditForm((f) => ({ ...f, published: v }))}
                  />
                  <span className="text-sm">Published</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={commitEdit}
                    disabled={isPending}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // View mode
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{item.name}</span>
                    {item.role && (
                      <span className="text-xs text-muted-foreground">· {item.role}</span>
                    )}
                    <Badge variant={item.published ? "success" : "outline"}>
                      {item.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    &ldquo;{item.quote}&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => togglePublished(item.id)}
                    disabled={isPending}
                    aria-label={item.published ? "Unpublish" : "Publish"}
                    title={item.published ? "Unpublish" : "Publish"}
                  >
                    {item.published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(item)}
                    aria-label="Edit testimonial"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  {deletingId === item.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                      >
                        Delete
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => { setDeletingId(item.id); setEditingId(null); }}
                      aria-label="Delete testimonial"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createFaq,
  updateFaq,
  deleteFaq,
  toggleFaqPublished,
} from "@/lib/actions/faq";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  displayOrder: number;
  published: boolean;
}

interface Props {
  initial: FaqItem[];
}

type EditState = { question: string; answer: string; published: boolean };
const emptyEdit: EditState = { question: "", answer: "", published: false };

/** Returns false when the value is empty — handles both plain text and TipTap JSON. */
function hasContent(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const doc = JSON.parse(value);
    if (doc?.type !== "doc") return true; // unknown format — assume non-empty
    function hasText(node: { type: string; text?: string; content?: unknown[] }): boolean {
      if (node.type === "text") return (node.text?.trim().length ?? 0) > 0;
      return (node.content ?? []).some((c) => hasText(c as typeof node));
    }
    return (doc.content ?? []).some((n: { type: string; text?: string; content?: unknown[] }) => hasText(n));
  } catch {
    return value.trim().length > 0;
  }
}

export function FaqManager({ initial }: Props) {
  const [faqs, setFaqs] = useState<FaqItem[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<EditState>(emptyEdit);
  const [addError, setAddError] = useState<string | null>(null);

  // Per-item state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditState>(emptyEdit);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEdit(faq: FaqItem) {
    setEditingId(faq.id);
    setEditForm({ question: faq.question, answer: faq.answer, published: faq.published });
    setDeletingId(null);
    setExpandedId(null);
  }

  function handleAdd() {
    setAddError(null);
    if (!addForm.question.trim()) { setAddError("Question is required."); return; }
    if (!hasContent(addForm.answer)) { setAddError("Answer is required."); return; }
    startTransition(async () => {
      const result = await createFaq({
        question: addForm.question.trim(),
        answer: addForm.answer.trim(),
        published: addForm.published,
      });
      if (result.success) {
        setFaqs((prev) => [...prev, result.faq]);
        setAddForm(emptyEdit);
        setShowAdd(false);
      } else {
        setAddError(result.error);
      }
    });
  }

  function commitEdit(id: string) {
    if (!editForm.question.trim() || !hasContent(editForm.answer)) return;
    startTransition(async () => {
      const result = await updateFaq(id, {
        question: editForm.question.trim(),
        answer: editForm.answer.trim(),
        published: editForm.published,
      });
      if (result.success) {
        setFaqs((prev) => prev.map((f) => (f.id === id ? result.faq : f)));
        setEditingId(null);
      } else {
        setGlobalError(result.error);
      }
    });
  }

  function handleToggle(id: string, published: boolean) {
    startTransition(async () => {
      const result = await toggleFaqPublished(id, !published);
      if (result.success) {
        setFaqs((prev) =>
          prev.map((f) => (f.id === id ? { ...f, published: !f.published } : f)),
        );
      } else {
        setGlobalError(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteFaq(id);
      if (result.success) {
        setFaqs((prev) => prev.filter((f) => f.id !== id));
        setDeletingId(null);
      } else {
        setGlobalError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Only published FAQs appear on the public FAQ page.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAdd((v) => !v);
              setAddError(null);
              setAddForm(emptyEdit);
            }}
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add FAQ
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {globalError && (
          <p className="text-sm text-destructive">{globalError}</p>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="rounded-md border p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">New FAQ</p>
            <div className="space-y-1.5">
              <Label htmlFor="new-question">Question</Label>
              <Input
                id="new-question"
                value={addForm.question}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, question: e.target.value }))
                }
                placeholder="What is your cancellation policy?"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Answer</Label>
              <RichTextEditor
                value={addForm.answer}
                onChange={(val) => setAddForm((f) => ({ ...f, answer: val }))}
                placeholder="Your answer…"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="new-faq-published"
                checked={addForm.published}
                onCheckedChange={(v) => setAddForm((f) => ({ ...f, published: v }))}
              />
              <Label htmlFor="new-faq-published" className="cursor-pointer">
                Publish immediately
              </Label>
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleAdd}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Add FAQ"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAdd(false);
                  setAddError(null);
                  setAddForm(emptyEdit);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {faqs.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No FAQs yet. Add one above.
          </p>
        )}

        {/* FAQ list */}
        {faqs.map((faq) => (
          <div key={faq.id} className="rounded-md border">
            {editingId === faq.id ? (
              // Edit mode
              <div className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label>Question</Label>
                  <Input
                    value={editForm.question}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, question: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Answer</Label>
                  <RichTextEditor
                    value={editForm.answer}
                    onChange={(val) => setEditForm((f) => ({ ...f, answer: val }))}
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
                    onClick={() => commitEdit(faq.id)}
                    disabled={isPending}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    {isPending ? "Saving…" : "Save"}
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
              <div>
                {/* Header row */}
                <div className="flex items-start gap-3 p-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((id) => (id === faq.id ? null : faq.id))
                    }
                    className="flex-1 text-left min-w-0"
                    aria-expanded={expandedId === faq.id}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{faq.question}</span>
                      <Badge variant={faq.published ? "success" : "outline"}>
                        {faq.published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((id) => (id === faq.id ? null : faq.id))
                      }
                      aria-label={expandedId === faq.id ? "Collapse" : "Expand"}
                      className="p-1 rounded hover:bg-muted"
                    >
                      {expandedId === faq.id ? (
                        <ChevronUp className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggle(faq.id, faq.published)}
                      disabled={isPending}
                    >
                      {faq.published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(faq)}
                      aria-label="Edit FAQ"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    {deletingId === faq.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(faq.id)}
                          disabled={isPending}
                        >
                          {isPending ? "…" : "Delete"}
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
                        onClick={() => {
                          setDeletingId(faq.id);
                          setEditingId(null);
                        }}
                        aria-label="Delete FAQ"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </div>
                {/* Expanded answer */}
                {expandedId === faq.id && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground border-t pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

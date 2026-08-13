"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, Check, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/services";

interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  displayOrder: number;
  _count: { services: number };
}

interface Props {
  initial: CategoryItem[];
}

type FormState = { name: string; description: string; active: boolean };
const emptyForm: FormState = { name: "", description: "", active: true };

export function CategoryManager({ initial }: Props) {
  const [categories, setCategories] = useState<CategoryItem[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(emptyForm);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleAdd() {
    setAddError(null);
    if (!addForm.name.trim()) { setAddError("Category name is required."); return; }
    startTransition(async () => {
      const result = await createCategory({
        name: addForm.name.trim(),
        description: addForm.description.trim(),
        active: addForm.active,
      });
      if (result.success) {
        // Reload state from server via router refresh would be ideal,
        // but for simplicity we do a soft optimistic update and let RSC revalidate
        setCategories((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: addForm.name.trim(),
            description: addForm.description.trim() || null,
            active: addForm.active,
            displayOrder: prev.length,
            _count: { services: 0 },
          },
        ]);
        setAddForm(emptyForm);
        setShowAdd(false);
      } else {
        setAddError(result.error);
      }
    });
  }

  function startEdit(cat: CategoryItem) {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name,
      description: cat.description ?? "",
      active: cat.active,
    });
    setEditError(null);
    setDeletingId(null);
  }

  function commitEdit(cat: CategoryItem) {
    setEditError(null);
    if (!editForm.name.trim()) { setEditError("Name is required."); return; }
    startTransition(async () => {
      const result = await updateCategory(cat.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        active: editForm.active,
        displayOrder: cat.displayOrder,
      });
      if (result.success) {
        setCategories((prev) =>
          prev.map((c) =>
            c.id === cat.id
              ? {
                  ...c,
                  name: editForm.name.trim(),
                  description: editForm.description.trim() || null,
                  active: editForm.active,
                }
              : c,
          ),
        );
        setEditingId(null);
      } else {
        setEditError(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCategory(id);
      if (result.success) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setDeletingId(null);
      } else {
        setGlobalError(result.error);
        setDeletingId(null);
      }
    });
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((c, i) => ({ ...c, displayOrder: i }));
    setCategories(reordered);
    // Persist the new order for the moved item
    const moved = reordered[target];
    startTransition(async () => {
      await updateCategory(moved.id, {
        name: moved.name,
        description: moved.description ?? "",
        active: moved.active,
        displayOrder: moved.displayOrder,
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Service categories</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Inactive categories are hidden from the service editor.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAdd((v) => !v);
              setAddError(null);
              setAddForm(emptyForm);
            }}
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            Add category
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {globalError && <p className="text-sm text-destructive">{globalError}</p>}

        {/* Add form */}
        {showAdd && (
          <div className="rounded-md border p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">New category</p>
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Braids"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description (optional)</Label>
              <Textarea
                id="cat-desc"
                value={addForm.description}
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description…"
                rows={2}
                maxLength={500}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="cat-active"
                checked={addForm.active}
                onCheckedChange={(v) => setAddForm((f) => ({ ...f, active: v }))}
              />
              <Label htmlFor="cat-active" className="cursor-pointer">Active</Label>
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleAdd} disabled={isPending}>
                {isPending ? "Saving…" : "Add category"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setShowAdd(false); setAddError(null); setAddForm(emptyForm); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {categories.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No categories yet. Add one above.
          </p>
        )}

        {categories.map((cat, idx) => (
          <div key={cat.id} className="rounded-md border">
            {editingId === cat.id ? (
              <div className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    maxLength={500}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editForm.active}
                    onCheckedChange={(v) => setEditForm((f) => ({ ...f, active: v }))}
                  />
                  <span className="text-sm">Active</span>
                </div>
                {editError && <p className="text-sm text-destructive">{editError}</p>}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => commitEdit(cat)} disabled={isPending}>
                    <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    {isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{cat.name}</span>
                    {!cat.active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {cat._count.services} {cat._count.services === 1 ? "service" : "services"}
                    </span>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {cat.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button" size="sm" variant="ghost"
                    onClick={() => moveCategory(idx, -1)}
                    disabled={idx === 0 || isPending}
                    aria-label="Move up" className="h-7 w-7 p-0"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button" size="sm" variant="ghost"
                    onClick={() => moveCategory(idx, 1)}
                    disabled={idx === categories.length - 1 || isPending}
                    aria-label="Move down" className="h-7 w-7 p-0"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button" size="sm" variant="ghost"
                    onClick={() => startEdit(cat)}
                    aria-label="Edit category"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  {deletingId === cat.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button" size="sm" variant="destructive"
                        onClick={() => handleDelete(cat.id)} disabled={isPending}
                      >
                        {isPending ? "…" : "Delete"}
                      </Button>
                      <Button
                        type="button" size="sm" variant="ghost"
                        onClick={() => setDeletingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button" size="sm" variant="ghost"
                      onClick={() => { setDeletingId(cat.id); setEditingId(null); }}
                      aria-label="Delete category"
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

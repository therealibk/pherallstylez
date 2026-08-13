"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEPOSIT_TYPE,
  type DepositTypeValue,
  penceToPounds,
  DEPOSIT_TYPE_LABELS,
  type ServiceQuestionInput,
} from "@/lib/service-format-utils";
import type { ServiceInput } from "@/lib/service-schemas";
import { createService, updateService, validateServiceImage } from "@/lib/actions/services";
import { QuestionBuilder } from "./question-builder";

interface CategoryOption {
  id: string;
  name: string;
  active: boolean;
}

interface ExistingService {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  durationMins: number;
  bufferMins: number;
  pricePence: number;
  depositType: DepositTypeValue;
  depositPence: number | null;
  depositPercentage: number | null;
  imageUrl: string | null;
  preparationNotes: string | null;
  active: boolean;
  featured: boolean;
  questions: {
    id: string;
    label: string;
    questionType: string;
    required: boolean;
    displayOrder: number;
    options: { id: string; label: string; displayOrder: number }[];
  }[];
}

interface Props {
  categories: CategoryOption[];
  service?: ExistingService;
}

export function ServiceForm({ categories, service }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [categoryId, setCategoryId] = useState(service?.categoryId ?? "");
  const [durationMins, setDurationMins] = useState(
    String(service?.durationMins ?? 60),
  );
  const [bufferMins, setBufferMins] = useState(String(service?.bufferMins ?? 0));
  const [pricePounds, setPricePounds] = useState(
    service ? penceToPounds(service.pricePence) : "",
  );
  const [depositType, setDepositType] = useState<DepositTypeValue>(
    (service?.depositType as DepositTypeValue) ?? DEPOSIT_TYPE.NONE,
  );
  const [depositPounds, setDepositPounds] = useState(
    service?.depositPence ? penceToPounds(service.depositPence) : "",
  );
  const [depositPercentage, setDepositPercentage] = useState(
    service?.depositPercentage ? String(service.depositPercentage) : "",
  );
  const [imageUrl, setImageUrl] = useState(service?.imageUrl ?? "");
  const [preparationNotes, setPreparationNotes] = useState(
    service?.preparationNotes ?? "",
  );
  const [active, setActive] = useState(service?.active ?? true);
  const [featured, setFeatured] = useState(service?.featured ?? false);
  const [questions, setQuestions] = useState<ServiceQuestionInput[]>(
    service?.questions.map((q) => ({
      id: q.id,
      label: q.label,
      questionType: q.questionType as import("@/lib/service-format-utils").QuestionTypeValue,
      required: q.required,
      displayOrder: q.displayOrder,
      options: q.options.map((o) => ({
        id: o.id,
        label: o.label,
        displayOrder: o.displayOrder,
      })),
    })) ?? [],
  );

  const activeCategories = categories.filter((c) => c.active);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const result = await validateServiceImage(fd);
      if (result.success) {
        setImageUrl(result.url);
      } else {
        setImageError(result.error);
      }
    });
  }

  function buildInput(): ServiceInput {
    return {
      name,
      description,
      categoryId: categoryId || null,
      durationMins: parseInt(durationMins, 10) || 60,
      bufferMins: parseInt(bufferMins, 10) || 0,
      pricePounds,
      depositType,
      depositPounds: depositType === DEPOSIT_TYPE.FIXED ? depositPounds : undefined,
      depositPercentage:
        depositType === DEPOSIT_TYPE.PERCENTAGE
          ? parseInt(depositPercentage, 10) || undefined
          : undefined,
      imageUrl,
      preparationNotes,
      active,
      featured,
      questions,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input = buildInput();
    startTransition(async () => {
      const result = service
        ? await updateService(service.id, input)
        : await createService(input);
      if (result.success) {
        router.push("/admin/services");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Service name <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Knotless Braids"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description shown to customers…"
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">No category</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={active}
                onCheckedChange={setActive}
              />
              <Label htmlFor="active" className="cursor-pointer">
                Active (visible to customers)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="featured"
                checked={featured}
                onCheckedChange={setFeatured}
              />
              <Label htmlFor="featured" className="cursor-pointer">
                Featured on homepage
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing & duration */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing &amp; duration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label htmlFor="price">Price (£) *</Label>
              <Input
                id="price"
                type="text"
                inputMode="decimal"
                value={pricePounds}
                onChange={(e) => setPricePounds(e.target.value)}
                placeholder="80.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration (min) *</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={480}
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="buffer">Buffer (min)</Label>
              <Input
                id="buffer"
                type="number"
                min={0}
                max={120}
                value={bufferMins}
                onChange={(e) => setBufferMins(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="depositType">Deposit</Label>
            <select
              id="depositType"
              value={depositType}
              onChange={(e) => setDepositType(e.target.value as DepositTypeValue)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:max-w-xs"
            >
              {Object.entries(DEPOSIT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {depositType === DEPOSIT_TYPE.FIXED && (
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="depositAmount">Deposit amount (£) *</Label>
              <Input
                id="depositAmount"
                type="text"
                inputMode="decimal"
                value={depositPounds}
                onChange={(e) => setDepositPounds(e.target.value)}
                placeholder="20.00"
                required
              />
            </div>
          )}

          {depositType === DEPOSIT_TYPE.PERCENTAGE && (
            <div className="space-y-1.5 sm:max-w-xs">
              <Label htmlFor="depositPct">Deposit percentage (%) *</Label>
              <Input
                id="depositPct"
                type="number"
                min={1}
                max={100}
                value={depositPercentage}
                onChange={(e) => setDepositPercentage(e.target.value)}
                placeholder="25"
                required
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image */}
      <Card>
        <CardHeader>
          <CardTitle>Service image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {imageUrl ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Service preview"
                className="h-40 w-full rounded-md object-cover"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImageUrl("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Remove image
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/30 p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              aria-label="Upload service image"
            >
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Click to upload a JPEG, PNG, or WebP image (max 2 MB)
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleImageChange}
            aria-label="Service image file"
          />
          {imageError && <p className="text-sm text-destructive">{imageError}</p>}
        </CardContent>
      </Card>

      {/* Preparation notes */}
      <Card>
        <CardHeader>
          <CardTitle>Preparation notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="prep"
            value={preparationNotes}
            onChange={(e) => setPreparationNotes(e.target.value)}
            placeholder="Internal notes shown to customers during booking, e.g. 'Come with clean, detangled hair.'"
            rows={3}
            maxLength={2000}
          />
        </CardContent>
      </Card>

      {/* Booking questions */}
      <Card>
        <CardHeader>
          <CardTitle>Booking questions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Questions customers answer when booking this service.
          </p>
        </CardHeader>
        <CardContent>
          <QuestionBuilder questions={questions} onChange={setQuestions} />
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? service
              ? "Saving…"
              : "Creating…"
            : service
              ? "Save changes"
              : "Create service"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/services")}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

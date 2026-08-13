"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, Star, Power } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatGBP, formatDuration } from "@/lib/service-format-utils";
import { deleteService, setServiceActive, setServiceFeatured } from "@/lib/actions/services";

interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  pricePence: number;
  durationMins: number;
  active: boolean;
  featured: boolean;
  category: { name: string } | null;
}

interface Props {
  initial: ServiceItem[];
}

export function ServiceList({ initial }: Props) {
  const [services, setServices] = useState<ServiceItem[]>(initial);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleToggleActive(id: string, current: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setServiceActive(id, !current);
      if (result.success) {
        setServices((prev) =>
          prev.map((s) => (s.id === id ? { ...s, active: !current } : s)),
        );
      } else {
        setError(result.error);
      }
    });
  }

  function handleToggleFeatured(id: string, current: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setServiceFeatured(id, !current);
      if (result.success) {
        setServices((prev) =>
          prev.map((s) => (s.id === id ? { ...s, featured: !current } : s)),
        );
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deleteService(id);
      if (result.success) {
        setServices((prev) => prev.filter((s) => s.id !== id));
        setDeletingId(null);
      } else {
        setDeleteError(result.error);
        setDeletingId(null);
      }
    });
  }

  if (services.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No services yet.{" "}
        <Link href="/admin/services/new" className="underline underline-offset-2">
          Add your first service
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

      {services.map((s) => (
        <div
          key={s.id}
          className="flex items-start gap-3 rounded-md border p-3 sm:p-4"
        >
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm truncate">{s.name}</span>
              {s.category && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {s.category.name}
                </Badge>
              )}
              {!s.active && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Inactive
                </Badge>
              )}
              {s.featured && (
                <Badge variant="outline" className="text-xs shrink-0 text-yellow-600 border-yellow-400">
                  Featured
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatGBP(s.pricePence)} &middot; {formatDuration(s.durationMins)}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleToggleFeatured(s.id, s.featured)}
              disabled={isPending}
              aria-label={s.featured ? "Unfeature service" : "Feature service"}
              title={s.featured ? "Remove from featured" : "Feature on homepage"}
              className={s.featured ? "text-yellow-600" : "text-muted-foreground"}
            >
              <Star
                className="h-4 w-4"
                aria-hidden="true"
                fill={s.featured ? "currentColor" : "none"}
              />
            </Button>

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleToggleActive(s.id, s.active)}
              disabled={isPending}
              aria-label={s.active ? "Deactivate service" : "Activate service"}
              title={s.active ? "Deactivate" : "Activate"}
              className={s.active ? "text-green-600" : "text-muted-foreground"}
            >
              <Power className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Link
              href={`/admin/services/${s.id}/edit`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              aria-label="Edit service"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </Link>

            {deletingId === s.id ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(s.id)}
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
                onClick={() => setDeletingId(s.id)}
                aria-label="Delete service"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

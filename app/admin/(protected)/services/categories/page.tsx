import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { CategoryManager } from "@/components/admin/services/category-manager";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Service Categories — Pherall Admin" };

export default async function CategoriesPage() {
  const categories = await db.serviceCategory.findMany({
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      active: true,
      displayOrder: true,
      _count: { select: { services: true } },
    },
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Service categories"
        description="Organise your services into categories."
      >
        <Link
          href="/admin/services"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to services
        </Link>
      </PageHeader>
      <CategoryManager initial={categories} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "@/components/admin/services/service-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "New Service — Pherall Admin" };

export default async function NewServicePage() {
  const categories = await db.serviceCategory.findMany({
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true, active: true },
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="New service"
        description="Add a service to your menu."
      >
        <Link
          href="/admin/services"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to services
        </Link>
      </PageHeader>
      <ServiceForm categories={categories} />
    </div>
  );
}

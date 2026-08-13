import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Settings2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { ServiceList } from "@/components/admin/services/service-list";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Services — Pherall Admin" };

export default async function ServicesPage() {
  const services = await db.service.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      pricePence: true,
      durationMins: true,
      active: true,
      featured: true,
      category: { select: { name: true } },
    },
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Services"
        description="Manage the services you offer to clients."
      >
        <Link
          href="/admin/services/categories"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Settings2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Categories
        </Link>
        <Link
          href="/admin/services/new"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
          Add service
        </Link>
      </PageHeader>

      <ServiceList initial={services} />
    </div>
  );
}

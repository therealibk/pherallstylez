import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "@/components/admin/services/service-form";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Edit Service — Pherall Admin" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: Props) {
  const { id } = await params;

  const [service, categories] = await Promise.all([
    db.service.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { displayOrder: "asc" },
          include: {
            options: { orderBy: { displayOrder: "asc" } },
          },
        },
      },
    }),
    db.serviceCategory.findMany({
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, active: true },
    }),
  ]);

  if (!service) notFound();

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title={`Edit: ${service.name}`}
        description="Update service details, pricing, and booking questions."
      >
        <Link
          href="/admin/services"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to services
        </Link>
      </PageHeader>
      <ServiceForm categories={categories} service={service} />
    </div>
  );
}

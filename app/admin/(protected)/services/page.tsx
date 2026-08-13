import type { Metadata } from "next";
import { Scissors } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "Services — Pherall Admin" };

export default function ServicesPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Services"
        description="Manage the services you offer to clients."
      />
      <EmptyState
        icon={Scissors}
        title="Services management coming in a future phase"
        description="Create and configure your service menu — including pricing, duration, deposits, and booking questions."
      />
    </div>
  );
}

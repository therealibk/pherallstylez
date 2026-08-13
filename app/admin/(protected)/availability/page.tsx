import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "Availability — Pherall Admin" };

export default function AvailabilityPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Availability"
        description="Configure your recurring weekly working hours."
      />
      <EmptyState
        icon={Clock}
        title="Availability configuration coming in a future phase"
        description="Set your weekly availability — including support for multiple periods per day and day-by-day hours — when the booking engine is implemented."
      />
    </div>
  );
}

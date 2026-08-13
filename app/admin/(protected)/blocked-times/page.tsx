import type { Metadata } from "next";
import { CalendarX } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "Blocked Times — Pherall Admin" };

export default function BlockedTimesPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Blocked Times"
        description="Block specific dates, times, and periods when you are unavailable."
      />
      <EmptyState
        icon={CalendarX}
        title="Blocked times management coming in a future phase"
        description="Block holidays, personal appointments, and any other periods you are unavailable — they will be automatically excluded from public booking."
      />
    </div>
  );
}

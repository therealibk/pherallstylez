import type { Metadata } from "next";
import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "Calendar — Pherall Admin" };

export default function CalendarPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Calendar"
        description="View and manage your appointment schedule."
      />
      <EmptyState
        icon={Calendar}
        title="Calendar coming in a future phase"
        description="The interactive day, week, and month calendar view will be available once the booking engine is implemented."
      />
    </div>
  );
}

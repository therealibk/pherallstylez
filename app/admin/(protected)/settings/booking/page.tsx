import type { Metadata } from "next";
import { CalendarCog } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Booking Settings — Pherall Admin",
};

export default function BookingSettingsPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Booking"
        description="Configure booking rules, notice periods, and deposit requirements."
      />
      <EmptyState
        icon={CalendarCog}
        title="Booking settings coming in a future phase"
        description="Set minimum booking notice, maximum advance period, buffer time, cancellation deadlines, deposit rules, and reminder timing."
      />
    </div>
  );
}

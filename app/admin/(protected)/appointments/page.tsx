import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "Appointments — Pherall Admin" };

export default function AppointmentsPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Appointments"
        description="View, create, and manage client appointments."
      />
      <EmptyState
        icon={CalendarDays}
        title="Appointments coming in a future phase"
        description="Appointment management — including creation, rescheduling, and cancellation — will be available once the booking engine is implemented."
      />
    </div>
  );
}

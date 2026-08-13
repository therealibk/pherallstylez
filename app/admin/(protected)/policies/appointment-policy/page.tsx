import type { Metadata } from "next";
import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Appointment Policy — Pherall Admin",
};

export default function AppointmentPolicyPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Appointment Policy"
        description="Edit and publish your appointment policy."
      />
      <EmptyState
        icon={CalendarCheck}
        title="Policy editor coming in a future phase"
        description="Edit, version, and publish your Appointment Policy shown to clients during booking."
      />
    </div>
  );
}

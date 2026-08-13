import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Booking Policy — Pherall Admin",
};

export default function BookingPolicyPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Booking Policy"
        description="Edit and publish your booking policy."
      />
      <EmptyState
        icon={FileText}
        title="Policy editor coming in a future phase"
        description="Edit, version, and publish your Booking Policy shown to clients during the booking process."
      />
    </div>
  );
}

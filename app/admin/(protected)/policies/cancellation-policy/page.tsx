import type { Metadata } from "next";
import { Ban } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Cancellation Policy — Pherall Admin",
};

export default function CancellationPolicyPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Cancellation Policy"
        description="Edit and publish your cancellation policy."
      />
      <EmptyState
        icon={Ban}
        title="Policy editor coming in a future phase"
        description="Edit, version, and publish your Cancellation Policy — including configurable deadlines and conditions."
      />
    </div>
  );
}

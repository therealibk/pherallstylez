import type { Metadata } from "next";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Refund Policy — Pherall Admin",
};

export default function RefundPolicyPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Refund Policy"
        description="Edit and publish your refund policy."
      />
      <EmptyState
        icon={RotateCcw}
        title="Policy editor coming in a future phase"
        description="Edit, version, and publish your Refund Policy shown to clients during the booking process."
      />
    </div>
  );
}

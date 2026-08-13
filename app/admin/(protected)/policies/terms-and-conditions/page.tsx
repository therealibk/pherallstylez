import type { Metadata } from "next";
import { Scale } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Terms & Conditions — Pherall Admin",
};

export default function TermsAndConditionsPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Terms & Conditions"
        description="Edit and publish your terms and conditions."
      />
      <EmptyState
        icon={Scale}
        title="Policy editor coming in a future phase"
        description="Edit, version, and publish your Terms & Conditions shown to clients during booking and on the public website."
      />
    </div>
  );
}

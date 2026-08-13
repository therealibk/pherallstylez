import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Privacy Policy — Pherall Admin",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Privacy Policy"
        description="Edit and publish your privacy policy."
      />
      <EmptyState
        icon={Lock}
        title="Policy editor coming in a future phase"
        description="Edit, version, and publish the Privacy Policy shown to clients during booking and on the public website."
      />
    </div>
  );
}

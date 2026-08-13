import type { Metadata } from "next";
import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Account Settings — Pherall Admin",
};

export default function AccountSettingsPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Account"
        description="Manage your admin account and credentials."
      />
      <EmptyState
        icon={UserCog}
        title="Account settings coming in a future phase"
        description="Update your admin name, email address, and password from this section."
      />
    </div>
  );
}

import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Notification Settings — Pherall Admin",
};

export default function NotificationSettingsPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Notifications"
        description="Configure email reminders and notification preferences."
      />
      <EmptyState
        icon={Bell}
        title="Notification settings coming in a future phase"
        description="Configure reminder timing, email templates, and notification preferences once the email phase is implemented."
      />
    </div>
  );
}

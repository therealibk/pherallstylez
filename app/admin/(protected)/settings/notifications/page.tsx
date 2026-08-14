import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { getBookingSettings } from "@/lib/actions/booking-settings";
import { NotificationSettingsForm } from "./notification-settings-form";

export const metadata: Metadata = { title: "Notification Settings — Pherall Admin" };

export default async function NotificationSettingsPage() {
  const settings = await getBookingSettings();

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <PageHeader
        title="Notifications"
        description="Configure email reminders and customer permission settings."
      />
      <NotificationSettingsForm
        reminderHours={settings.reminderHours}
        customerCanCancel={settings.customerCanCancel}
        customerCanReschedule={settings.customerCanReschedule}
        cancellationDeadlineHours={settings.cancellationDeadlineHours}
        reschedulingDeadlineHours={settings.reschedulingDeadlineHours}
      />
    </div>
  );
}

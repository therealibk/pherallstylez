import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { getBookingSettings } from "@/lib/actions/booking-settings";
import { getEmailKeyStatus } from "@/lib/actions/email-settings";
import { db } from "@/lib/db";
import { NotificationSettingsForm } from "./notification-settings-form";
import { EmailDeliveryForm } from "./email-delivery-form";

export const metadata: Metadata = { title: "Notification Settings — Pherall Admin" };

export default async function NotificationSettingsPage() {
  const [settings, emailStatus, business] = await Promise.all([
    getBookingSettings(),
    getEmailKeyStatus(),
    db.businessSettings.findFirst({ select: { email: true } }),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-2xl space-y-10">
      <PageHeader
        title="Notifications"
        description="Configure email reminders and delivery settings."
      />

      <section aria-labelledby="reminders-heading">
        <h2 id="reminders-heading" className="text-base font-semibold mb-1">
          Reminder & Booking Rules
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Control when reminder emails are sent and what customers can self-manage.
        </p>
        <div className="rounded-xl border border-border bg-card p-5">
          <NotificationSettingsForm
            reminderHours={settings.reminderHours}
            customerCanCancel={settings.customerCanCancel}
            customerCanReschedule={settings.customerCanReschedule}
            cancellationDeadlineHours={settings.cancellationDeadlineHours}
            reschedulingDeadlineHours={settings.reschedulingDeadlineHours}
          />
        </div>
      </section>

      <section aria-labelledby="email-delivery-heading">
        <h2 id="email-delivery-heading" className="text-base font-semibold mb-1">
          Email Delivery
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Connect Resend to send booking confirmations, reminders, and cancellation emails.
          Keys saved here take precedence over environment variables.
        </p>
        <div className="rounded-xl border border-border bg-card p-5">
          <EmailDeliveryForm
            apiKey={{
              maskedValue: emailStatus.apiKey,
              source: emailStatus.apiKeySource,
            }}
            fromAddress={{
              maskedValue: emailStatus.fromAddress,
              source: emailStatus.fromAddressSource,
            }}
            businessEmail={business?.email ?? ""}
          />
        </div>
      </section>
    </div>
  );
}

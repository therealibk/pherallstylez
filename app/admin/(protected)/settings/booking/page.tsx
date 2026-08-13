import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { BookingSettingsForm } from "@/components/admin/settings/booking-settings-form";
import { getBookingSettings } from "@/lib/actions/booking-settings";

export const metadata: Metadata = { title: "Booking Settings — Pherall Admin" };

export default async function BookingSettingsPage() {
  const settings = await getBookingSettings();

  const initial = {
    minNoticeHours: settings.minNoticeHours,
    maxAdvanceDays: settings.maxAdvanceDays,
    defaultBufferMins: settings.defaultBufferMins,
    cancellationDeadlineHours: settings.cancellationDeadlineHours,
    reschedulingDeadlineHours: settings.reschedulingDeadlineHours,
    customerCanCancel: settings.customerCanCancel,
    customerCanReschedule: settings.customerCanReschedule,
    depositRequired: settings.depositRequired,
    paymentHoldMins: settings.paymentHoldMins,
    reminderHours: settings.reminderHours,
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <PageHeader
        title="Booking"
        description="Configure booking rules, notice periods, and deposit requirements."
      />
      <BookingSettingsForm initial={initial} />
    </div>
  );
}

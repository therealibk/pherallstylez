import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { BlockedPeriodsManager } from "@/components/admin/blocked-times/blocked-periods-manager";
import { getBlockedPeriods } from "@/lib/actions/availability-rules";
import { getBusinessSettings } from "@/lib/actions/booking-settings";

export const metadata: Metadata = { title: "Blocked Times — Pherall Admin" };

export default async function BlockedTimesPage() {
  const [periods, businessSettings] = await Promise.all([
    getBlockedPeriods(),
    getBusinessSettings(),
  ]);

  const serialised = periods.map((p) => ({
    id: p.id,
    startAt: p.startAt,
    endAt: p.endAt,
    allDay: p.allDay,
    reason: p.reason,
    recurrence: p.recurrence,
    recurrenceEndDate: p.recurrenceEndDate,
  }));

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <PageHeader
        title="Blocked Times"
        description="Block specific dates and periods when you are unavailable for bookings."
      />
      <BlockedPeriodsManager initial={serialised} timezone={businessSettings.timezone} />
    </div>
  );
}

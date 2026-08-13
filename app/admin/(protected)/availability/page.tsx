import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { AvailabilityEditor } from "@/components/admin/availability/availability-editor";
import { getAvailabilityRules } from "@/lib/actions/availability-rules";
import { getBusinessSettings } from "@/lib/actions/booking-settings";

export const metadata: Metadata = { title: "Availability — Pherall Admin" };

export default async function AvailabilityPage() {
  const [rules, businessSettings] = await Promise.all([
    getAvailabilityRules(),
    getBusinessSettings(),
  ]);

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <PageHeader
        title="Availability"
        description={`Configure your recurring weekly working hours (${businessSettings.timezone}).`}
      />
      <AvailabilityEditor initialRules={rules} />
    </div>
  );
}

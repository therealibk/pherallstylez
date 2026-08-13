import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { BusinessSettingsForm } from "@/components/admin/settings/business-settings-form";
import { getBusinessSettings } from "@/lib/actions/booking-settings";

export const metadata: Metadata = { title: "Business Settings — Pherall Admin" };

export default async function BusinessSettingsPage() {
  const settings = await getBusinessSettings();

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <PageHeader
        title="Business"
        description="Configure your business name, contact details, timezone, and currency."
      />
      <BusinessSettingsForm
        initial={{
          businessName: settings.businessName,
          ownerName: settings.ownerName,
          email: settings.email,
          phone: settings.phone,
          address: settings.address,
          timezone: settings.timezone,
          currency: settings.currency,
        }}
      />
    </div>
  );
}

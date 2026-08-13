import type { Metadata } from "next";
import { db } from "@/lib/db";
import { parseAppearanceData } from "@/lib/appearance-schemas";
import { PageHeader } from "@/components/admin/page-header";
import { AppearanceForm } from "@/components/admin/cms/appearance-form";

export const metadata: Metadata = { title: "Appearance — Pherall Admin" };

export default async function AppearancePage() {
  const settings = await db.businessSettings.findFirst({
    select: { appearanceData: true, logoUrl: true },
  });

  const appearance = parseAppearanceData(settings?.appearanceData);
  const logoUrl = settings?.logoUrl ?? null;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Appearance"
        description="Manage your public site's colours, typography, and logo."
      />
      <AppearanceForm
        initialColors={appearance.colors}
        initialFont={appearance.font}
        initialLogoUrl={logoUrl}
        initialFaviconUrl={appearance.faviconUrl}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Business Settings — Pherall Admin",
};

export default function BusinessSettingsPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Business"
        description="Configure your business name, contact details, and branding."
      />
      <EmptyState
        icon={Building2}
        title="Business settings coming in a future phase"
        description="Configure your business name, stylist name, email, phone, address, logo, timezone, and currency."
      />
    </div>
  );
}

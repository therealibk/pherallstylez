import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = {
  title: "Payment Settings — Pherall Admin",
};

export default function PaymentSettingsPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Payments"
        description="Configure Stripe integration and payment options."
      />
      <EmptyState
        icon={CreditCard}
        title="Payment settings coming in a future phase"
        description="Connect Stripe, configure deposit rules, and set your default payment options once the payment phase is implemented."
      />
    </div>
  );
}

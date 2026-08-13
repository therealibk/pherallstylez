import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "Payments — Pherall Admin" };

export default function PaymentsPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Payments"
        description="View payment history, deposits, and outstanding balances."
      />
      <EmptyState
        icon={CreditCard}
        title="Payments coming in a future phase"
        description="Payment records, Stripe integration, deposits, and refund management will be available once the payment phase is implemented."
      />
    </div>
  );
}

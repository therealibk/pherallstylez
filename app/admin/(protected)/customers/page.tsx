import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "Customers — Pherall Admin" };

export default function CustomersPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Customers"
        description="Browse and manage your client records."
      />
      <EmptyState
        icon={Users}
        title="Customers coming in a future phase"
        description="Customer records and management tools will be available once the booking engine is running and appointments begin coming in."
      />
    </div>
  );
}

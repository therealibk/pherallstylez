import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "FAQ — Pherall Admin" };

export default function FaqContentPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="FAQ"
        description="Create and manage frequently asked questions."
      />
      <EmptyState
        icon={BookOpen}
        title="FAQ management coming in a future phase"
        description="Add, edit, reorder, and publish FAQ entries that appear on the public FAQ page."
      />
    </div>
  );
}

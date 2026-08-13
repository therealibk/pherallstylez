import type { Metadata } from "next";
import { Globe } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "Homepage Content — Pherall Admin" };

export default function HomepageContentPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Homepage"
        description="Edit the hero section, featured content, and homepage copy."
      />
      <EmptyState
        icon={Globe}
        title="Homepage CMS coming in a future phase"
        description="Edit the public homepage — hero heading, description, images, and featured services — from this section."
      />
    </div>
  );
}

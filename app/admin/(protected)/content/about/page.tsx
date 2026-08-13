import type { Metadata } from "next";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "About Content — Pherall Admin" };

export default function AboutContentPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="About"
        description="Edit your biography, story, and about page content."
      />
      <EmptyState
        icon={Info}
        title="About CMS coming in a future phase"
        description="Edit your biography, profile images, and the supporting content shown on the public About page."
      />
    </div>
  );
}

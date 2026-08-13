import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const metadata: Metadata = { title: "Contact Content — Pherall Admin" };

export default function ContactContentPage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Contact"
        description="Update your contact details, location, and social links."
      />
      <EmptyState
        icon={Mail}
        title="Contact CMS coming in a future phase"
        description="Edit your email, phone, location, and social media links shown on the public Contact page."
      />
    </div>
  );
}

import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { PageSeoForm } from "@/components/admin/settings/page-seo-form";
import { getAllPageSeo } from "@/lib/actions/page-seo";

export const metadata: Metadata = { title: "SEO — Pherall Admin" };

export default async function SeoSettingsPage() {
  const initial = await getAllPageSeo();

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-8">
      <PageHeader
        title="SEO"
        description="Set the page title and meta description shown in Google search results and social shares for each public page. Leave blank to use the built-in defaults."
      />
      <PageSeoForm initial={initial} />
    </div>
  );
}

import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import { parseAboutData } from "@/lib/cms-schemas";
import { PageHeader } from "@/components/admin/page-header";
import { AboutForm } from "@/components/admin/cms/about-form";

export const metadata: Metadata = { title: "About Content — Pherall Admin" };

export default async function AboutContentPage() {
  const record = await db.siteContent.findUnique({
    where: { section: ContentSection.ABOUT },
  });
  const data = parseAboutData(record?.data);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="About"
        description="Edit the biography and content shown on your public About page."
      />
      <AboutForm initial={data} />
    </div>
  );
}

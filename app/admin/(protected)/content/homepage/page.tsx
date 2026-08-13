import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import { parseHomepageData } from "@/lib/cms-schemas";
import { PageHeader } from "@/components/admin/page-header";
import {
  HeroForm,
  HomepageAboutSectionForm,
  CtaForm,
} from "@/components/admin/cms/homepage-forms";
import { HomepageTestimonialsManager } from "@/components/admin/cms/homepage-testimonials-manager";

export const metadata: Metadata = { title: "Homepage Content — Pherall Admin" };

export default async function HomepageContentPage() {
  const record = await db.siteContent.findUnique({
    where: { section: ContentSection.HOMEPAGE },
  });
  const data = parseHomepageData(record?.data);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Homepage"
        description="Edit the content shown on your public homepage."
      />
      <HeroForm initial={data.hero} />
      <HomepageAboutSectionForm initial={data.aboutSection} />
      <HomepageTestimonialsManager initial={data.testimonials} />
      <CtaForm initial={data.cta} />
    </div>
  );
}

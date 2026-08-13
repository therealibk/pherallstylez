import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import { parseContactData } from "@/lib/cms-schemas";
import { PageHeader } from "@/components/admin/page-header";
import {
  ContactPageCopyForm,
  BusinessContactForm,
} from "@/components/admin/cms/contact-forms";

export const metadata: Metadata = { title: "Contact Content — Pherall Admin" };

export default async function ContactContentPage() {
  const [record, settings] = await Promise.all([
    db.siteContent.findUnique({ where: { section: ContentSection.CONTACT } }),
    db.businessSettings.findFirst(),
  ]);

  const pageCopy = parseContactData(record?.data);

  const businessContact = {
    email: settings?.email ?? "",
    phone: settings?.phone ?? "",
    address: settings?.address ?? "",
    instagramUrl: settings?.instagramUrl ?? "",
    tiktokUrl: settings?.tiktokUrl ?? "",
    facebookUrl: settings?.facebookUrl ?? "",
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Contact"
        description="Edit the contact page heading and your business contact details."
      />
      <ContactPageCopyForm initial={pageCopy} />
      <BusinessContactForm initial={businessContact} />
    </div>
  );
}

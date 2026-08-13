import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { FaqManager } from "@/components/admin/cms/faq-manager";

export const metadata: Metadata = { title: "FAQ — Pherall Admin" };

export default async function FaqContentPage() {
  const faqs = await db.faq.findMany({
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      question: true,
      answer: true,
      displayOrder: true,
      published: true,
    },
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="FAQ"
        description="Create and manage frequently asked questions. Only published FAQs appear on the public FAQ page."
      />
      <FaqManager initial={faqs} />
    </div>
  );
}

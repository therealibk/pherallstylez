import type { Metadata } from "next";
import { db } from "@/lib/db";
import { RichTextContent } from "@/components/public/rich-text-content";

export const metadata: Metadata = { title: "FAQ — Pherall" };

export default async function FaqPage() {
  const faqs = await db.faq.findMany({
    where: { published: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, question: true, answer: true },
  });

  return (
    <section className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Frequently Asked Questions
      </h1>

      {faqs.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No FAQs available yet.</p>
      ) : (
        <dl className="mt-8 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.id} className="border-b pb-6 last:border-0 last:pb-0">
              <dt className="font-medium">{faq.question}</dt>
              <dd className="mt-2">
                <RichTextContent
                  content={faq.answer}
                  className="text-sm text-muted-foreground [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-2"
                />
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

import type { Metadata } from "next";
import { db } from "@/lib/db";

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
              <dd className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

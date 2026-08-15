import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { RichTextContent } from "@/components/public/rich-text-content";
import { getPageSeo } from "@/lib/actions/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("faq");
  const title = seo.title?.trim() || "FAQ — Pherall";
  const description = seo.description?.trim() || undefined;
  return { title, ...(description ? { description } : {}) };
}

export default async function FaqPage() {
  const faqs = await db.faq.findMany({
    where: { published: true },
    orderBy: { displayOrder: "asc" },
    select: { id: true, question: true, answer: true },
  });

  return (
    <div>
      {/* Header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--primary,#2d2d2d)", opacity: 0.6 }}
          >
            Help
          </p>
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            Frequently Asked Questions
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-14 md:py-20">
        {faqs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No FAQs available yet.</p>
          </div>
        ) : (
          <dl className="divide-y" style={{ borderColor: "var(--border,#e5e7eb)" }}>
            {faqs.map((faq) => (
              <div key={faq.id} className="py-7 first:pt-0 last:pb-0">
                <dt
                  className="text-base font-semibold leading-snug mb-3"
                  style={{ color: "var(--foreground)" }}
                >
                  {faq.question}
                </dt>
                <dd>
                  <RichTextContent
                    content={faq.answer}
                    className="text-sm text-muted-foreground leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-2 [&_strong]:text-foreground"
                  />
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* Still have a question? */}
        <div
          className="mt-14 rounded-2xl px-8 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
          style={{ background: "var(--secondary,#f5f5f5)" }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
              Still have a question?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Get in touch and we&apos;ll be happy to help.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-sm font-semibold shrink-0 transition-opacity hover:opacity-70"
            style={{ color: "var(--foreground)" }}
          >
            Contact us
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

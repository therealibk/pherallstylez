import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import { parseAboutData } from "@/lib/cms-schemas";
import { RichTextContent } from "@/components/public/rich-text-content";

export const metadata: Metadata = { title: "About — Pherall" };

export default async function AboutPage() {
  const record = await db.siteContent.findUnique({
    where: { section: ContentSection.ABOUT },
  });
  const data = parseAboutData(record?.data);

  return (
    <div>
      {/* Header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--primary,#2d2d2d)", opacity: 0.6 }}
          >
            About
          </p>
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {data.heading || "About Us"}
          </h1>
          {data.introduction && (
            <div className="mt-6 max-w-2xl">
              <RichTextContent
                content={data.introduction}
                className="text-lg text-muted-foreground leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* Biography + photo */}
      {(data.biography || data.imageUrl) && (
        <section className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <div className="grid gap-12 md:grid-cols-[1fr_320px] md:items-start">
            {data.biography && (
              <div>
                <RichTextContent
                  content={data.biography}
                  className="text-muted-foreground leading-relaxed [&_p]:mb-4 [&_p:last-child]:mb-0 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3 [&_strong]:text-foreground"
                />
              </div>
            )}
            {data.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.imageUrl}
                alt="Stylist photo"
                className="w-full aspect-[3/4] object-cover rounded-2xl md:sticky md:top-24"
              />
            )}
          </div>
        </section>
      )}

      {/* Fallback */}
      {!data.heading && !data.biography && !data.imageUrl && (
        <div className="max-w-4xl mx-auto px-6 py-16">
          <p className="text-muted-foreground">About content coming soon.</p>
        </div>
      )}

      {/* CTA */}
      {data.ctaHeading && (
        <section style={{ background: "var(--primary,#2d2d2d)" }}>
          <div
            className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center"
            style={{ color: "var(--primary-foreground,#fff)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ opacity: 0.5 }}>
              Ready?
            </p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
              {data.ctaHeading}
            </h2>
            {data.ctaDescription && (
              <p className="mt-4 text-base max-w-md mx-auto leading-relaxed" style={{ opacity: 0.75 }}>
                {data.ctaDescription}
              </p>
            )}
            {data.ctaButtonText && (
              <Link
                href="/book"
                className="mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--button-foreground,#fff)", color: "var(--button,#1a1a1a)" }}
              >
                {data.ctaButtonText}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

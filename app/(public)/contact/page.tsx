import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import { parseContactData } from "@/lib/cms-schemas";
import { RichTextContent } from "@/components/public/rich-text-content";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Contact — Pherall" };

export default async function ContactPage() {
  const [record, settings] = await Promise.all([
    db.siteContent.findUnique({ where: { section: ContentSection.CONTACT } }),
    db.businessSettings.findFirst(),
  ]);

  const copy = parseContactData(record?.data);

  return (
    <div>
      {/* Header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--primary,#2d2d2d)", opacity: 0.6 }}
          >
            Contact
          </p>
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {copy.heading || "Get in touch"}
          </h1>
          {copy.introduction && (
            <div className="mt-5 max-w-xl">
              <RichTextContent
                content={copy.introduction}
                className="text-lg text-muted-foreground leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          {/* Contact details */}
          {settings && (
            <section aria-labelledby="contact-heading">
              <h2 id="contact-heading" className="text-lg font-semibold mb-6" style={{ color: "var(--foreground)" }}>
                Contact details
              </h2>
              <dl className="space-y-5">
                {settings.email && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      Email
                    </dt>
                    <dd>
                      <a
                        href={`mailto:${settings.email}`}
                        className="text-sm font-medium transition-opacity hover:opacity-70"
                        style={{ color: "var(--foreground)" }}
                      >
                        {settings.email}
                      </a>
                    </dd>
                  </div>
                )}
                {settings.phone && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      Phone
                    </dt>
                    <dd>
                      <a
                        href={`tel:${settings.phone}`}
                        className="text-sm font-medium transition-opacity hover:opacity-70"
                        style={{ color: "var(--foreground)" }}
                      >
                        {settings.phone}
                      </a>
                    </dd>
                  </div>
                )}
                {settings.address && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      Location
                    </dt>
                    <dd className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {settings.address}
                    </dd>
                  </div>
                )}
                {(settings.instagramUrl || settings.tiktokUrl || settings.facebookUrl) && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                      Social
                    </dt>
                    <dd className="flex flex-wrap gap-4">
                      {settings.instagramUrl && (
                        <a
                          href={settings.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium transition-opacity hover:opacity-70"
                          style={{ color: "var(--foreground)" }}
                        >
                          Instagram
                        </a>
                      )}
                      {settings.tiktokUrl && (
                        <a
                          href={settings.tiktokUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium transition-opacity hover:opacity-70"
                          style={{ color: "var(--foreground)" }}
                        >
                          TikTok
                        </a>
                      )}
                      {settings.facebookUrl && (
                        <a
                          href={settings.facebookUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium transition-opacity hover:opacity-70"
                          style={{ color: "var(--foreground)" }}
                        >
                          Facebook
                        </a>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Opening hours */}
          {copy.openingHours && (
            <section aria-labelledby="hours-heading">
              <h2 id="hours-heading" className="text-lg font-semibold mb-6" style={{ color: "var(--foreground)" }}>
                Opening hours
              </h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {copy.openingHours}
              </p>
            </section>
          )}
        </div>

        {/* Fallback */}
        {!copy.heading && !settings?.email && (
          <p className="text-muted-foreground text-sm">Contact details coming soon.</p>
        )}

        {/* Book CTA */}
        <div
          className="mt-16 rounded-2xl px-8 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
          style={{ background: "var(--secondary,#f5f5f5)" }}
        >
          <div>
            <h2 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>
              Ready to book?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse services and secure your appointment online.
            </p>
          </div>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold shrink-0 transition-opacity hover:opacity-85"
            style={{ background: "var(--button,#1a1a1a)", color: "var(--button-foreground,#fff)" }}
          >
            Book an appointment
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

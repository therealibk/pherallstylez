import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import { parseContactData } from "@/lib/cms-schemas";

export const metadata: Metadata = { title: "Contact — Pherall" };

export default async function ContactPage() {
  const [record, settings] = await Promise.all([
    db.siteContent.findUnique({ where: { section: ContentSection.CONTACT } }),
    db.businessSettings.findFirst(),
  ]);

  const copy = parseContactData(record?.data);

  return (
    <div>
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">
          {copy.heading || "Contact"}
        </h1>
        {copy.introduction && (
          <p className="mt-4 text-muted-foreground max-w-xl">{copy.introduction}</p>
        )}

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {/* Contact details */}
          {settings && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Get in Touch</h2>
              {settings.email && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email
                  </dt>
                  <dd>
                    <a
                      href={`mailto:${settings.email}`}
                      className="text-sm underline underline-offset-4"
                    >
                      {settings.email}
                    </a>
                  </dd>
                </div>
              )}
              {settings.phone && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Phone
                  </dt>
                  <dd className="text-sm">{settings.phone}</dd>
                </div>
              )}
              {settings.address && (
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Address
                  </dt>
                  <dd className="text-sm whitespace-pre-wrap">{settings.address}</dd>
                </div>
              )}
              {/* Social links */}
              {(settings.instagramUrl || settings.tiktokUrl || settings.facebookUrl) && (
                <div className="flex gap-4 pt-2">
                  {settings.instagramUrl && (
                    <a
                      href={settings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline underline-offset-4"
                    >
                      Instagram
                    </a>
                  )}
                  {settings.tiktokUrl && (
                    <a
                      href={settings.tiktokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline underline-offset-4"
                    >
                      TikTok
                    </a>
                  )}
                  {settings.facebookUrl && (
                    <a
                      href={settings.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline underline-offset-4"
                    >
                      Facebook
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Opening hours */}
          {copy.openingHours && (
            <div>
              <h2 className="text-lg font-semibold">Opening Hours</h2>
              <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {copy.openingHours}
              </p>
            </div>
          )}
        </div>

        {/* Fallback */}
        {!copy.heading && !settings?.email && (
          <p className="mt-4 text-muted-foreground">Contact details coming soon.</p>
        )}
      </section>
    </div>
  );
}

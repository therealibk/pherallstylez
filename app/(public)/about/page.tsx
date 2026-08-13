import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import { parseAboutData } from "@/lib/cms-schemas";

export const metadata: Metadata = { title: "About — Pherall" };

export default async function AboutPage() {
  const record = await db.siteContent.findUnique({
    where: { section: ContentSection.ABOUT },
  });
  const data = parseAboutData(record?.data);

  return (
    <div>
      {/* Heading */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">
          {data.heading || "About"}
        </h1>
        {data.introduction && (
          <p className="mt-4 text-lg text-muted-foreground">{data.introduction}</p>
        )}
      </section>

      {/* Biography */}
      {(data.biography || data.imageUrl) && (
        <section className="max-w-3xl mx-auto px-6 pb-16 grid gap-10 md:grid-cols-[1fr_auto]">
          {data.biography && (
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              {data.biography
                .split(/\n\n+/)
                .filter(Boolean)
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-wrap">
                    {para}
                  </p>
                ))}
            </div>
          )}
          {data.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.imageUrl}
              alt="Stylist photo"
              className="w-full md:w-64 max-h-[400px] object-cover rounded-xl self-start"
            />
          )}
        </section>
      )}

      {/* CTA */}
      {data.ctaHeading && (
        <section className="bg-muted/30">
          <div className="max-w-3xl mx-auto px-6 py-12 text-center">
            <h2 className="text-xl font-semibold">{data.ctaHeading}</h2>
            {data.ctaDescription && (
              <p className="mt-2 text-muted-foreground">{data.ctaDescription}</p>
            )}
            {data.ctaButtonText && (
              <a
                href="/book"
                className="mt-6 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
              >
                {data.ctaButtonText}
              </a>
            )}
          </div>
        </section>
      )}

      {/* Fallback when no CMS content set */}
      {!data.heading && !data.biography && (
        <section className="max-w-3xl mx-auto px-6 pb-16">
          <p className="text-muted-foreground">About content coming soon.</p>
        </section>
      )}
    </div>
  );
}

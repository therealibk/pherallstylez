import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import { parseHomepageData } from "@/lib/cms-schemas";
import { formatGBP, formatDuration } from "@/lib/service-schemas";
import { RichTextContent } from "@/components/public/rich-text-content";
import { plainTextFromRichText } from "@/lib/rich-text";

export const metadata: Metadata = {
  title: "Pherall — Professional Hair Styling",
  description: "Book your hair appointment online.",
};

export default async function HomePage() {
  const [record, featuredServices] = await Promise.all([
    db.siteContent.findUnique({ where: { section: ContentSection.HOMEPAGE } }),
    db.service.findMany({
      where: { active: true, featured: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        pricePence: true,
        durationMins: true,
        imageUrl: true,
      },
    }),
  ]);
  const data = parseHomepageData(record?.data);

  const { hero, aboutSection, testimonials, cta } = data;
  const publishedTestimonials = testimonials
    .filter((t) => t.published)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div>
      {/* Hero */}
      <section className="relative">
        {hero.imageUrl ? (
          <div className="relative min-h-[60vh] md:min-h-[75vh] flex items-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.imageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="relative z-10 max-w-5xl mx-auto px-6 py-16 text-white">
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-tight">
                {hero.heading || "Professional Hair Styling"}
              </h1>
              {hero.description && (
                <RichTextContent
                  content={hero.description}
                  className="mt-4 text-lg text-white/80 max-w-xl leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
                />
              )}
              <Link
                href="/book"
                className="mt-8 inline-block rounded-full px-8 py-3.5 text-sm font-semibold transition-opacity hover:opacity-85"
                style={{ background: "var(--button)", color: "var(--button-foreground)" }}
              >
                {hero.buttonText || "Book Now"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-6 py-24 md:py-32">
            <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-tight">
              {hero.heading || "Professional Hair Styling"}
            </h1>
            {hero.description && (
              <RichTextContent
                content={hero.description}
                className="mt-6 text-xl text-muted-foreground max-w-xl leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
              />
            )}
            <Link
              href="/book"
              className="mt-10 inline-block rounded-full px-8 py-3.5 text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: "var(--button)", color: "var(--button-foreground)" }}
            >
              {hero.buttonText || "Book Now"}
            </Link>
          </div>
        )}
      </section>

      {/* About teaser */}
      {aboutSection.heading && (
        <section className="bg-[var(--secondary)]/40">
          <div className="max-w-5xl mx-auto px-6 py-20 grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight leading-tight">
                {aboutSection.heading}
              </h2>
              {aboutSection.description && (
                <RichTextContent
                  content={aboutSection.description}
                  className="mt-5 text-muted-foreground leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
                />
              )}
              {aboutSection.buttonText && (
                <a
                  href="/about"
                  className="mt-8 inline-block text-sm font-semibold border-b-2 pb-0.5 transition-opacity hover:opacity-70"
                  style={{ borderColor: "var(--primary)" }}
                >
                  {aboutSection.buttonText}
                </a>
              )}
            </div>
            {aboutSection.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={aboutSection.imageUrl}
                alt="About"
                className="w-full aspect-[4/3] object-cover rounded-2xl shadow-sm"
              />
            )}
          </div>
        </section>
      )}

      {/* Featured services */}
      {featuredServices.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="flex items-end justify-between mb-10 gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">Featured services</h2>
            <Link
              href="/services"
              className="text-sm font-medium border-b pb-0.5 transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--primary)" }}
            >
              View all
            </Link>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {featuredServices.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/services/${s.slug}`}
                  className="group block rounded-xl border overflow-hidden hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    {s.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.imageUrl}
                        alt={s.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-muted-foreground/30 text-4xl" aria-hidden="true">✂</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-1.5">
                    <h3 className="font-semibold text-base leading-tight">{s.name}</h3>
                    {s.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {plainTextFromRichText(s.description)}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm font-medium">{formatGBP(s.pricePence)}</span>
                      <span className="text-xs text-muted-foreground">{formatDuration(s.durationMins)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Testimonials */}
      {publishedTestimonials.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight text-center">
            What clients say
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publishedTestimonials.map((t) => (
              <blockquote
                key={t.id}
                className="rounded-2xl border p-7 space-y-4"
              >
                <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                <footer className="text-sm font-semibold">
                  {t.name}
                  {t.role && (
                    <span className="font-normal text-muted-foreground"> · {t.role}</span>
                  )}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      {cta.heading && (
        <section style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          <div className="max-w-5xl mx-auto px-6 py-20 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">{cta.heading}</h2>
            {cta.description && (
              <RichTextContent
                content={cta.description}
                className="mt-5 opacity-80 max-w-lg mx-auto leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
              />
            )}
            <Link
              href="/book"
              className="mt-10 inline-block rounded-full px-8 py-3.5 text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: "var(--button-foreground)", color: "var(--button)" }}
            >
              {cta.buttonText || "Book an Appointment"}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

import Link from "next/link";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import { parseHomepageData } from "@/lib/cms-schemas";
import { formatGBP, formatDuration } from "@/lib/service-schemas";
import { RichTextContent } from "@/components/public/rich-text-content";
import { plainTextFromRichText } from "@/lib/rich-text";
import { Clock, ArrowRight } from "lucide-react";

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: "Pherall",
    url: appUrl,
    description: "Professional hair styling and beauty services. Book your appointment online.",
    ...(hero.imageUrl ? { image: hero.imageUrl } : {}),
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${appUrl}/book`,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: {
        "@type": "Reservation",
        name: "Hair appointment",
      },
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative">
        {hero.imageUrl ? (
          <div className="relative min-h-[70vh] md:min-h-[85vh] flex items-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.imageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="relative z-10 w-full">
              <div className="max-w-6xl mx-auto px-6 pb-16 md:pb-24">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-4">
                  Professional Hair Styling
                </p>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] text-white max-w-2xl">
                  {hero.heading || "Premium Hair Styling"}
                </h1>
                {hero.description && (
                  <div className="mt-5 max-w-md">
                    <RichTextContent
                      content={hero.description}
                      className="text-base md:text-lg text-white/75 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
                    />
                  </div>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/book"
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: "var(--button,#fff)", color: "var(--button-foreground,#1a1a1a)" }}
                  >
                    {hero.buttonText || "Book Now"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/services"
                    className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold border border-white/30 text-white transition-colors hover:border-white/60 hover:bg-white/10"
                  >
                    View services
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* No-image hero — editorial / typographic */
          <div
            className="relative overflow-hidden"
            style={{ background: "var(--secondary,#f5f5f5)" }}
          >
            <div className="max-w-6xl mx-auto px-6 py-24 md:py-36">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
                Professional Hair Styling
              </p>
              <h1
                className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.05] max-w-3xl"
                style={{ color: "var(--foreground)" }}
              >
                {hero.heading || "Premium Hair Styling"}
              </h1>
              {hero.description && (
                <div className="mt-6 max-w-lg">
                  <RichTextContent
                    content={hero.description}
                    className="text-lg text-muted-foreground leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
                  />
                </div>
              )}
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-opacity hover:opacity-85"
                  style={{ background: "var(--button,#1a1a1a)", color: "var(--button-foreground,#fff)" }}
                >
                  {hero.buttonText || "Book Now"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold border transition-colors hover:bg-foreground/5"
                  style={{ borderColor: "var(--border,#e5e7eb)", color: "var(--foreground)" }}
                >
                  View services
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── About teaser ───────────────────────────────────────────────────── */}
      {aboutSection.heading && (
        <section>
          <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid gap-12 md:grid-cols-2 md:items-center">
            <div className="order-2 md:order-1">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: "var(--primary,#2d2d2d)", opacity: 0.6 }}
              >
                About
              </p>
              <h2
                className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight"
                style={{ color: "var(--foreground)" }}
              >
                {aboutSection.heading}
              </h2>
              {aboutSection.description && (
                <div className="mt-5">
                  <RichTextContent
                    content={aboutSection.description}
                    className="text-muted-foreground leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0"
                  />
                </div>
              )}
              {aboutSection.buttonText && (
                <Link
                  href="/about"
                  className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
                  style={{ color: "var(--foreground)" }}
                >
                  {aboutSection.buttonText}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              )}
            </div>
            {aboutSection.imageUrl ? (
              <div className="order-1 md:order-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aboutSection.imageUrl}
                  alt="About"
                  className="w-full aspect-[4/3] object-cover rounded-2xl"
                />
              </div>
            ) : (
              <div
                className="order-1 md:order-2 aspect-[4/3] rounded-2xl flex items-center justify-center"
                style={{ background: "var(--secondary,#f5f5f5)" }}
              >
                <span className="text-5xl opacity-20" aria-hidden="true">✂</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Featured services ──────────────────────────────────────────────── */}
      {featuredServices.length > 0 && (
        <section style={{ background: "var(--secondary,#f5f5f5)" }}>
          <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
            <div className="flex items-end justify-between mb-10 gap-4">
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: "var(--primary,#2d2d2d)", opacity: 0.6 }}
                >
                  Services
                </p>
                <h2
                  className="text-3xl font-semibold tracking-tight"
                  style={{ color: "var(--foreground)" }}
                >
                  Featured services
                </h2>
              </div>
              <Link
                href="/services"
                className="flex items-center gap-1.5 text-sm font-semibold shrink-0 transition-opacity hover:opacity-70"
                style={{ color: "var(--foreground)" }}
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" role="list">
              {featuredServices.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/services/${s.slug}`}
                    className="group block rounded-2xl overflow-hidden bg-background transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="aspect-[3/2] overflow-hidden bg-muted">
                      {s.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.imageUrl}
                          alt={s.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl text-muted-foreground/20" aria-hidden="true">✂</span>
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3
                        className="font-semibold text-base leading-tight"
                        style={{ color: "var(--foreground)" }}
                      >
                        {s.name}
                      </h3>
                      {s.description && (
                        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {plainTextFromRichText(s.description)}
                        </p>
                      )}
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                          {formatGBP(s.pricePence)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {formatDuration(s.durationMins)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      {publishedTestimonials.length > 0 && (
        <section>
          <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
            <div className="text-center mb-12">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: "var(--primary,#2d2d2d)", opacity: 0.6 }}
              >
                Testimonials
              </p>
              <h2
                className="text-3xl font-semibold tracking-tight"
                style={{ color: "var(--foreground)" }}
              >
                What clients say
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {publishedTestimonials.map((t) => (
                <blockquote
                  key={t.id}
                  className="flex flex-col justify-between rounded-2xl border p-7 gap-6"
                  style={{ borderColor: "var(--border,#e5e7eb)" }}
                >
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      {t.name}
                    </p>
                    {t.role && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                    )}
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      {cta.heading && (
        <section style={{ background: "var(--primary,#2d2d2d)" }}>
          <div
            className="max-w-4xl mx-auto px-6 py-24 md:py-32 text-center"
            style={{ color: "var(--primary-foreground,#fff)" }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ opacity: 0.5 }}
            >
              Ready?
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
              {cta.heading}
            </h2>
            {cta.description && (
              <div className="mt-5 max-w-lg mx-auto opacity-75">
                <RichTextContent
                  content={cta.description}
                  className="text-base leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0"
                />
              </div>
            )}
            <Link
              href="/book"
              className="mt-10 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--button-foreground,#fff)", color: "var(--button,#1a1a1a)" }}
            >
              {cta.buttonText || "Book an Appointment"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

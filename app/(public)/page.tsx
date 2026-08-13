import type { Metadata } from "next";
import { db } from "@/lib/db";
import { ContentSection } from "@/lib/generated/prisma/client";
import { parseHomepageData } from "@/lib/cms-schemas";

export const metadata: Metadata = {
  title: "Pherall — Professional Hair Styling",
  description: "Book your hair appointment online.",
};

export default async function HomePage() {
  const record = await db.siteContent.findUnique({
    where: { section: ContentSection.HOMEPAGE },
  });
  const data = parseHomepageData(record?.data);

  const { hero, aboutSection, testimonials, cta } = data;
  const publishedTestimonials = testimonials
    .filter((t) => t.published)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-semibold tracking-tight">
          {hero.heading || "Professional Hair Styling"}
        </h1>
        {hero.description && (
          <p className="mt-4 text-lg text-muted-foreground max-w-xl">
            {hero.description}
          </p>
        )}
        {hero.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero.imageUrl}
            alt="Hero"
            className="mt-8 w-full max-h-[480px] object-cover rounded-xl"
          />
        )}
        <a
          href="/book"
          className="mt-8 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
        >
          {hero.buttonText || "Book Now"}
        </a>
      </section>

      {/* About teaser */}
      {aboutSection.heading && (
        <section className="bg-muted/30">
          <div className="max-w-5xl mx-auto px-6 py-16 grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                {aboutSection.heading}
              </h2>
              {aboutSection.description && (
                <p className="mt-4 text-muted-foreground">{aboutSection.description}</p>
              )}
              {aboutSection.buttonText && (
                <a
                  href="/about"
                  className="mt-6 inline-block text-sm font-medium underline underline-offset-4"
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
                className="w-full max-h-[400px] object-cover rounded-xl"
              />
            )}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {publishedTestimonials.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight text-center">
            What clients say
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {publishedTestimonials.map((t) => (
              <blockquote
                key={t.id}
                className="rounded-xl border p-6 space-y-3"
              >
                <p className="text-sm text-muted-foreground">"{t.quote}"</p>
                <footer className="text-sm font-medium">
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
        <section className="bg-foreground text-background">
          <div className="max-w-5xl mx-auto px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold">{cta.heading}</h2>
            {cta.description && (
              <p className="mt-4 text-background/80 max-w-lg mx-auto">
                {cta.description}
              </p>
            )}
            <a
              href="/book"
              className="mt-8 inline-block rounded-full bg-background text-foreground px-6 py-3 text-sm font-medium"
            >
              {cta.buttonText || "Book an Appointment"}
            </a>
          </div>
        </section>
      )}
    </div>
  );
}

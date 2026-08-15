import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { formatGBP, formatDuration } from "@/lib/service-schemas";
import { plainTextFromRichText } from "@/lib/rich-text";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.serviceCategory.findUnique({
    where: { slug, active: true },
    select: { name: true },
  });
  if (!category) return { title: "Not found — Pherall" };
  return {
    title: `${category.name} — Book Online | Pherall`,
    description: `Browse ${category.name} services and book your appointment online.`,
  };
}

export default async function BookCategoryPage({ params }: Props) {
  const { slug } = await params;

  const category = await db.serviceCategory.findUnique({
    where: { slug, active: true },
    select: {
      id: true,
      name: true,
      description: true,
      services: {
        where: { active: true },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          pricePence: true,
          durationMins: true,
          imageUrl: true,
          featured: true,
        },
      },
    },
  });

  if (!category) notFound();

  return (
    <div>
      {/* Breadcrumb + header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6" aria-label="Breadcrumb">
            <Link href="/book" className="hover:text-foreground transition-colors">Book</Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span style={{ color: "var(--foreground)" }}>{category.name}</span>
          </nav>
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-4 text-lg text-muted-foreground max-w-xl leading-relaxed">
              {category.description}
            </p>
          )}
        </div>
      </div>

      {/* Services */}
      <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
        {category.services.length === 0 ? (
          <div className="text-center py-24">
            <span className="text-5xl opacity-20" aria-hidden="true">✂</span>
            <p className="mt-4 text-muted-foreground text-sm">
              No services available in this category yet. Check back soon.
            </p>
            <Link
              href="/book"
              className="mt-6 inline-flex text-sm font-medium underline underline-offset-2"
              style={{ color: "var(--primary,#2d2d2d)" }}
            >
              Back to categories
            </Link>
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {category.services.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/services/${s.slug}`}
                  className="group flex flex-col rounded-2xl overflow-hidden bg-card border border-transparent transition-all hover:shadow-lg hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="aspect-[3/2] overflow-hidden bg-muted shrink-0">
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

                  <div className="flex flex-col flex-1 p-5 gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h2
                        className="font-semibold text-base leading-tight"
                        style={{ color: "var(--foreground)" }}
                      >
                        {s.name}
                      </h2>
                      {s.featured && (
                        <span
                          className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{ background: "var(--primary,#2d2d2d)", color: "var(--primary-foreground,#fff)" }}
                        >
                          Featured
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                        {plainTextFromRichText(s.description)}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1 mt-auto">
                      <span
                        className="text-base font-semibold"
                        style={{ color: "var(--foreground)" }}
                      >
                        {formatGBP(s.pricePence)}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {formatDuration(s.durationMins)}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-1 text-xs font-semibold pt-1 border-t"
                      style={{ borderColor: "var(--border,#e5e7eb)", color: "var(--primary,#2d2d2d)" }}
                    >
                      Book this service
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

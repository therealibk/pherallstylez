import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatGBP, formatDuration } from "@/lib/service-schemas";
import { plainTextFromRichText } from "@/lib/rich-text";
import { Clock, ArrowRight } from "lucide-react";
import { getPageSeo } from "@/lib/actions/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("services");
  const title = seo.title?.trim() || "Services — Pherall";
  const description = seo.description?.trim() || "Browse all available hair styling services and book your appointment online.";
  return { title, description, openGraph: { title, description } };
}

export default async function ServicesPage() {
  const services = await db.service.findMany({
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      pricePence: true,
      durationMins: true,
      imageUrl: true,
      featured: true,
      category: { select: { id: true, name: true } },
    },
  });

  // Group by category
  const categoryMap = new Map<
    string,
    { id: string; name: string; services: typeof services }
  >();
  const uncategorised: typeof services = [];

  for (const s of services) {
    if (s.category) {
      const key = s.category.id;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { id: key, name: s.category.name, services: [] });
      }
      categoryMap.get(key)!.services.push(s);
    } else {
      uncategorised.push(s);
    }
  }

  const groups = [...categoryMap.values()];
  if (uncategorised.length > 0) {
    groups.push({ id: "__none", name: "Other Services", services: uncategorised });
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--primary,#2d2d2d)", opacity: 0.6 }}
          >
            All Services
          </p>
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            Hair styling services
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl leading-relaxed">
            Expert styling tailored to you. Browse all services and book online.
          </p>
        </div>
      </div>

      {/* Service grid */}
      <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
        {services.length === 0 ? (
          <div className="text-center py-24">
            <span className="text-5xl opacity-20" aria-hidden="true">✂</span>
            <p className="mt-4 text-muted-foreground text-sm">
              Services coming soon. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`cat-${group.id}`}>
                {groups.length > 1 && (
                  <div className="flex items-center gap-4 mb-8">
                    <h2
                      id={`cat-${group.id}`}
                      className="text-lg font-semibold shrink-0"
                      style={{ color: "var(--foreground)" }}
                    >
                      {group.name}
                    </h2>
                    <div
                      className="flex-1 h-px"
                      style={{ background: "var(--border,#e5e7eb)" }}
                      aria-hidden="true"
                    />
                  </div>
                )}
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="list">
                  {group.services.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/services/${s.slug}`}
                        className="group flex flex-col rounded-2xl overflow-hidden bg-card border border-transparent transition-all hover:shadow-lg hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {/* Image */}
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

                        {/* Card body */}
                        <div className="flex flex-col flex-1 p-5 gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3
                              className="font-semibold text-base leading-tight"
                              style={{ color: "var(--foreground)" }}
                            >
                              {s.name}
                            </h3>
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
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

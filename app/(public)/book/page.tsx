import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { getPageSeo } from "@/lib/actions/page-seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("services");
  const title = seo.title?.trim() || "Book an Appointment — Pherall";
  const description = seo.description?.trim() || "Choose a service category to get started.";
  return { title, description };
}

export default async function BookPage() {
  const categories = await db.serviceCategory.findMany({
    where: { active: true, slug: { not: null } },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: { select: { services: { where: { active: true } } } },
    },
  });

  // If no categories configured, send straight to services listing
  if (categories.length === 0) {
    const { redirect } = await import("next/navigation");
    redirect("/services");
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--primary,#2d2d2d)", opacity: 0.6 }}
          >
            Book Online
          </p>
          <h1
            className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            What are you booking?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl leading-relaxed">
            Choose a category to see available services and book your appointment.
          </p>
        </div>
      </div>

      {/* Category grid */}
      <div className="max-w-4xl mx-auto px-6 py-14 md:py-20">
        <ul className="grid gap-5 sm:grid-cols-2" role="list">
          {categories.map((cat) => (
            <li key={cat.id}>
              <Link
                href={`/book/${cat.slug}`}
                className="group flex flex-col gap-3 rounded-2xl border p-6 transition-all hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                style={{ background: "var(--card,#fff)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2
                    className="text-xl font-semibold leading-snug"
                    style={{ color: "var(--foreground)" }}
                  >
                    {cat.name}
                  </h2>
                  <ArrowRight
                    className="h-5 w-5 shrink-0 mt-0.5 transition-transform group-hover:translate-x-1"
                    style={{ color: "var(--primary,#2d2d2d)" }}
                    aria-hidden="true"
                  />
                </div>
                {cat.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {cat.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-auto">
                  {cat._count.services}{" "}
                  {cat._count.services === 1 ? "service" : "services"} available
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Want to browse everything?{" "}
          <Link
            href="/services"
            className="font-medium underline underline-offset-2"
            style={{ color: "var(--primary,#2d2d2d)" }}
          >
            View all services
          </Link>
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatGBP, formatDuration } from "@/lib/service-schemas";

export const metadata: Metadata = {
  title: "Services",
  description: "Browse all available hair styling services.",
};

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
    groups.push({ id: "__none", name: "Other services", services: uncategorised });
  }

  return (
    <main>
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Services
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Expert hair styling tailored to you. Book any service online.
          </p>
        </header>

        {services.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Services coming soon.
          </p>
        ) : (
          <div className="space-y-14">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`cat-${group.id}`}>
                {groups.length > 1 && (
                  <h2
                    id={`cat-${group.id}`}
                    className="text-xl font-semibold mb-6 pb-2 border-b"
                  >
                    {group.name}
                  </h2>
                )}
                <ul
                  className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                  role="list"
                >
                  {group.services.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/services/${s.slug}`}
                        className="group block rounded-xl border overflow-hidden hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {/* Image / placeholder */}
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
                              <span className="text-muted-foreground/30 text-4xl" aria-hidden="true">
                                ✂
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="p-4 space-y-2">
                          <h3 className="font-semibold text-base leading-tight">
                            {s.name}
                          </h3>
                          {s.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {s.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-sm font-medium">
                              {formatGBP(s.pricePence)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(s.durationMins)}
                            </span>
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
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Banknote } from "lucide-react";
import { db } from "@/lib/db";
import { formatGBP, formatDuration } from "@/lib/service-schemas";
import { getAvailableDatesForMonth } from "@/lib/actions/public-availability";
import { getBusinessSettings } from "@/lib/actions/booking-settings";
import { BookingDateTimePicker } from "@/components/public/booking/booking-date-time-picker";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await db.service.findUnique({
    where: { slug, active: true },
    select: { name: true },
  });
  if (!service) return { title: "Service not found" };
  return { title: `Book ${service.name} — Pherall` };
}

export default async function BookServicePage({ params }: Props) {
  const { slug } = await params;

  const [service, businessSettings] = await Promise.all([
    db.service.findUnique({
      where: { slug, active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        pricePence: true,
        durationMins: true,
        bufferMins: true,
        description: true,
        category: { select: { name: true } },
      },
    }),
    getBusinessSettings(),
  ]);

  if (!service) notFound();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const initialAvailableDates = await getAvailableDatesForMonth(slug, year, month);

  return (
    <div>
      {/* Step header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-3xl mx-auto px-6 py-8 md:py-12">
          <Link
            href={`/services/${service.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to service details
          </Link>
          {service.category && (
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--primary,#2d2d2d)", opacity: 0.6 }}
            >
              {service.category.name}
            </p>
          )}
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight"
            style={{ color: "var(--foreground)" }}
          >
            Book {service.name}
          </h1>
          <div className="mt-3 flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Banknote className="h-4 w-4 shrink-0" aria-hidden="true" />
              {formatGBP(service.pricePence)}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              {formatDuration(service.durationMins)}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        <h2
          className="text-sm font-semibold mb-6"
          style={{ color: "var(--foreground)" }}
        >
          Choose your date and time
        </h2>
        <BookingDateTimePicker
          serviceSlug={slug}
          initialYear={year}
          initialMonth={month}
          initialAvailableDates={initialAvailableDates}
          timezone={businessSettings.timezone}
        />
      </div>
    </div>
  );
}

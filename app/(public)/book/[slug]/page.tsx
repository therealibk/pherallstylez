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
    <main className="max-w-3xl mx-auto px-6 py-12 md:py-16 space-y-10">
      {/* Back */}
      <Link
        href={`/services/${service.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to service details
      </Link>

      {/* Service summary */}
      <div>
        {service.category && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            {service.category.name}
          </p>
        )}
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-3">
          Book {service.name}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Banknote className="h-4 w-4" aria-hidden="true" />
            {formatGBP(service.pricePence)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {formatDuration(service.durationMins)}
          </span>
        </div>
      </div>

      <p className="text-sm font-medium">Choose your date and time</p>

      {/* Date + time picker */}
      <BookingDateTimePicker
        serviceSlug={slug}
        initialYear={year}
        initialMonth={month}
        initialAvailableDates={initialAvailableDates}
        timezone={businessSettings.timezone}
      />
    </main>
  );
}

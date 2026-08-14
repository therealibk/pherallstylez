import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Banknote } from "lucide-react";
import { getBookingPageData } from "@/lib/actions/booking";
import { formatGBP, formatDuration } from "@/lib/service-format-utils";
import { BookingConfirmFlow } from "@/components/public/booking/booking-confirm-flow";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; time?: string }>;
}

export default async function BookingConfirmPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { date, time } = await searchParams;

  if (!date || !time) redirect(`/book/${slug}`);

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!dateRegex.test(date) || !timeRegex.test(time)) redirect(`/book/${slug}`);

  const data = await getBookingPageData(slug);
  if (!data) notFound();

  const displayDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(
    new Date(date + "T12:00:00Z"),
  );

  return (
    <div>
      {/* Step header */}
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-xl mx-auto px-6 py-8 md:py-10">
          <Link
            href={`/book/${slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Change date or time
          </Link>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Complete your booking
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {data.service.name}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {displayDate} at {time}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Banknote className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {formatGBP(data.service.pricePence)} · {formatDuration(data.service.durationMins)}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-6 py-10 md:py-14">
        <BookingConfirmFlow
          service={data.service}
          policies={data.policies}
          dateStr={date}
          timeStr={time}
          timezone={data.timezone}
        />
      </div>
    </div>
  );
}

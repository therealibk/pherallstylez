import { notFound, redirect } from "next/navigation";
import { getBookingPageData } from "@/lib/actions/booking";
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

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Complete your booking</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Fill in your details to confirm your appointment.
        </p>
      </div>

      <BookingConfirmFlow
        service={data.service}
        policies={data.policies}
        dateStr={date}
        timeStr={time}
        timezone={data.timezone}
      />
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Banknote, ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { formatGBP, formatDuration } from "@/lib/service-schemas";
import { DepositType, QuestionType } from "@/lib/generated/prisma/client";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await db.service.findUnique({
    where: { slug, active: true },
    select: { name: true, description: true },
  });
  if (!service) return { title: "Service not found" };
  return {
    title: service.name,
    description: service.description ?? undefined,
  };
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  TEXT: "Short text",
  TEXTAREA: "Long text",
  SELECT: "Select one",
  RADIO: "Select one",
  CHECKBOX: "Select all that apply",
};

function depositLabel(
  type: DepositType,
  pence: number | null,
  pct: number | null,
): string | null {
  if (type === DepositType.NONE) return null;
  if (type === DepositType.FULL) return "Full payment required at booking";
  if (type === DepositType.FIXED && pence) return `${formatGBP(pence)} deposit required`;
  if (type === DepositType.PERCENTAGE && pct) return `${pct}% deposit required`;
  return null;
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;

  const service = await db.service.findUnique({
    where: { slug, active: true },
    include: {
      category: { select: { name: true } },
      questions: {
        orderBy: { displayOrder: "asc" },
        include: { options: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });

  if (!service) notFound();

  const deposit = depositLabel(
    service.depositType,
    service.depositPence,
    service.depositPercentage,
  );

  return (
    <main>
      {/* Hero image or simple header */}
      {service.imageUrl ? (
        <div className="relative h-64 md:h-80 bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={service.imageUrl}
            alt={service.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
              {service.name}
            </h1>
            {service.category && (
              <p className="text-white/70 text-sm mt-1">{service.category.name}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-6 pt-16 md:pt-20">
          {service.category && (
            <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">
              {service.category.name}
            </p>
          )}
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {service.name}
          </h1>
        </div>
      )}

      <section className="max-w-3xl mx-auto px-6 py-10 md:py-14 space-y-10">
        {/* Back link */}
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All services
        </Link>

        {/* Key facts */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2 text-sm">
            <Banknote className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <span className="font-medium">{formatGBP(service.pricePence)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <span>{formatDuration(service.durationMins)}</span>
          </div>
          {deposit && (
            <div className="text-sm text-muted-foreground">{deposit}</div>
          )}
        </div>

        {/* Description */}
        {service.description && (
          <div>
            <h2 className="text-lg font-semibold mb-3">About this service</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {service.description}
            </p>
          </div>
        )}

        {/* Preparation notes */}
        {service.preparationNotes && (
          <div className="rounded-xl border bg-muted/40 p-5">
            <h2 className="text-base font-semibold mb-2">How to prepare</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {service.preparationNotes}
            </p>
          </div>
        )}

        {/* Booking questions */}
        {service.questions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">
              We&apos;ll ask you at booking
            </h2>
            <ul className="space-y-3" role="list">
              {service.questions.map((q) => (
                <li key={q.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{q.label}</p>
                    {q.required && (
                      <span className="text-xs text-muted-foreground shrink-0">Required</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {QUESTION_TYPE_LABELS[q.questionType]}
                  </p>
                  {q.options.length > 0 && (
                    <ul className="mt-2 space-y-1" role="list">
                      {q.options.map((o) => (
                        <li key={o.id} className="text-xs text-muted-foreground pl-3 border-l-2 border-muted">
                          {o.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-xl p-6 text-center"
          style={{ background: "var(--primary)", color: "var(--primary-foreground, #fff)" }}
        >
          <h2 className="text-xl font-semibold mb-2">Ready to book?</h2>
          <p className="text-sm opacity-80 mb-4">
            Choose your date and time online.
          </p>
          <Link
            href={`/book/${service.slug}`}
            className="inline-block rounded-lg px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: "var(--button)", color: "var(--button-foreground, #fff)" }}
          >
            Book now
          </Link>
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Banknote, ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { formatGBP, formatDuration } from "@/lib/service-schemas";
import { DepositType, QuestionType } from "@/lib/generated/prisma/client";
import { RichTextContent } from "@/components/public/rich-text-content";
import { plainTextFromRichText } from "@/lib/rich-text";

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
    title: `${service.name} — Pherall`,
    description: service.description
      ? plainTextFromRichText(service.description).slice(0, 160) || undefined
      : undefined,
  };
}

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  TEXT: "Short text answer",
  TEXTAREA: "Long text answer",
  SELECT: "Select one option",
  RADIO: "Select one option",
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
    <div>
      {/* Hero / header */}
      {service.imageUrl ? (
        <div className="relative h-72 md:h-[420px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={service.imageUrl}
            alt={service.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="max-w-3xl mx-auto w-full px-6 pb-10 md:pb-14">
              {service.category && (
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-3">
                  {service.category.name}
                </p>
              )}
              <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight leading-tight">
                {service.name}
              </h1>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--secondary,#f5f5f5)" }}>
          <div className="max-w-3xl mx-auto px-6 py-16 md:py-20">
            {service.category && (
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-4"
                style={{ color: "var(--primary,#2d2d2d)", opacity: 0.6 }}
              >
                {service.category.name}
              </p>
            )}
            <h1
              className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight"
              style={{ color: "var(--foreground)" }}
            >
              {service.name}
            </h1>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        {/* Back link */}
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All services
        </Link>

        {/* Key facts strip */}
        <div
          className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border p-5 mb-10"
          style={{ borderColor: "var(--border,#e5e7eb)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ background: "var(--secondary,#f5f5f5)" }}
            >
              <Banknote className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Price</p>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {formatGBP(service.pricePence)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ background: "var(--secondary,#f5f5f5)" }}
            >
              <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Duration</p>
              <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {formatDuration(service.durationMins)}
              </p>
            </div>
          </div>
          {deposit && (
            <p className="text-sm text-muted-foreground ml-auto">{deposit}</p>
          )}
        </div>

        {/* Description */}
        {service.description && (
          <section className="mb-10" aria-labelledby="desc-heading">
            <h2 id="desc-heading" className="text-lg font-semibold mb-4" style={{ color: "var(--foreground)" }}>
              About this service
            </h2>
            <RichTextContent
              content={service.description}
              className="text-muted-foreground leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-4 [&_strong]:text-foreground"
            />
          </section>
        )}

        {/* Preparation notes */}
        {service.preparationNotes && (
          <section
            className="mb-10 rounded-xl p-6"
            style={{ background: "var(--secondary,#f5f5f5)" }}
            aria-labelledby="prep-heading"
          >
            <h2 id="prep-heading" className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>
              How to prepare
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {service.preparationNotes}
            </p>
          </section>
        )}

        {/* Booking questions */}
        {service.questions.length > 0 && (
          <section className="mb-10" aria-labelledby="questions-heading">
            <h2 id="questions-heading" className="text-lg font-semibold mb-5" style={{ color: "var(--foreground)" }}>
              What we&apos;ll ask you
            </h2>
            <ul className="space-y-3" role="list">
              {service.questions.map((q) => (
                <li
                  key={q.id}
                  className="rounded-xl border p-4"
                  style={{ borderColor: "var(--border,#e5e7eb)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {q.label}
                    </p>
                    {q.required && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {QUESTION_TYPE_LABELS[q.questionType]}
                  </p>
                  {q.options.length > 0 && (
                    <ul className="mt-2.5 space-y-1.5" role="list">
                      {q.options.map((o) => (
                        <li key={o.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                          {o.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Booking CTA */}
        <div
          className="rounded-2xl px-8 py-10 text-center"
          style={{ background: "var(--primary,#2d2d2d)", color: "var(--primary-foreground,#fff)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ opacity: 0.5 }}>
            Ready?
          </p>
          <h2 className="text-2xl font-semibold tracking-tight mb-2">
            Book {service.name}
          </h2>
          <p className="text-sm mb-6" style={{ opacity: 0.7 }}>
            Choose your date and time — it only takes a minute.
          </p>
          <Link
            href={`/book/${service.slug}`}
            className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--button-foreground,#fff)", color: "var(--button,#1a1a1a)" }}
          >
            Book Now
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

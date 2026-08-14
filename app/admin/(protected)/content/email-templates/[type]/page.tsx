import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEmailTemplate } from "@/lib/actions/email-templates";
import { EmailTemplateForm } from "@/components/admin/cms/email-template-form";
import type { NotificationType } from "@/lib/generated/prisma/client";

const TYPE_LABELS: Record<string, string> = {
  BOOKING_CONFIRMATION: "Booking Received",
  PAYMENT_CONFIRMATION: "Payment Confirmed / Appointment Confirmed",
  APPOINTMENT_REMINDER: "Appointment Reminder",
  CANCELLATION_CONFIRMATION: "Appointment Cancelled",
  RESCHEDULE_CONFIRMATION: "Appointment Rescheduled",
  REFUND_CONFIRMATION: "Refund Processed",
};

const VALID_TYPES = new Set<string>([
  "BOOKING_CONFIRMATION",
  "PAYMENT_CONFIRMATION",
  "APPOINTMENT_REMINDER",
  "CANCELLATION_CONFIRMATION",
  "RESCHEDULE_CONFIRMATION",
  "REFUND_CONFIRMATION",
]);

interface Props {
  params: Promise<{ type: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const label = TYPE_LABELS[type] ?? type;
  return { title: `${label} Email — Pherall Admin` };
}

export default async function EmailTemplateEditPage({ params }: Props) {
  const { type } = await params;

  if (!VALID_TYPES.has(type)) notFound();

  const template = await getEmailTemplate(type as NotificationType);
  if (!template) notFound();

  const label = TYPE_LABELS[type] ?? type;

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <Link
        href="/admin/content/email-templates"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Email Templates
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit the subject and body for this email. Changes are saved immediately and used for all future sends.
        </p>
      </div>

      <EmailTemplateForm
        type={type as NotificationType}
        initialSubject={template.subject}
        initialBody={template.body}
        initialActive={template.active}
      />
    </div>
  );
}

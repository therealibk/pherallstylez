import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { getAllEmailTemplates } from "@/lib/actions/email-templates";
import { PageHeader } from "@/components/admin/page-header";

export const metadata: Metadata = { title: "Email Templates — Pherall Admin" };

const TYPE_LABELS: Record<string, string> = {
  BOOKING_CONFIRMATION: "Booking Received",
  PAYMENT_CONFIRMATION: "Payment Confirmed / Appointment Confirmed",
  APPOINTMENT_REMINDER: "Appointment Reminder",
  CANCELLATION_CONFIRMATION: "Appointment Cancelled",
  RESCHEDULE_CONFIRMATION: "Appointment Rescheduled",
  REFUND_CONFIRMATION: "Refund Processed",
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  BOOKING_CONFIRMATION: "Sent immediately when a customer submits a booking request.",
  PAYMENT_CONFIRMATION: "Sent when payment is successfully received and the appointment is confirmed.",
  APPOINTMENT_REMINDER: "Sent automatically before the appointment (timing set in Booking Settings).",
  CANCELLATION_CONFIRMATION: "Sent when an appointment is cancelled by the customer or admin.",
  RESCHEDULE_CONFIRMATION: "Sent when an appointment is rescheduled.",
  REFUND_CONFIRMATION: "Sent when a refund is processed.",
};

export default async function EmailTemplatesPage() {
  const templates = await getAllEmailTemplates();

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <PageHeader
        title="Email Templates"
        description="Customise the transactional emails sent to customers at each stage of their booking."
      />

      <div className="mt-6 rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs text-muted-foreground">
            Click any template to edit its subject line and body content. Use{" "}
            <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{"{{variable_name}}"}</code>{" "}
            placeholders to include dynamic booking information.
          </p>
        </div>

        {!templates || templates.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No email templates found. Run the database seed to create defaults.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {templates.map((tmpl) => (
              <li key={tmpl.id}>
                <Link
                  href={`/admin/content/email-templates/${tmpl.type}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
                    style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                      {TYPE_LABELS[tmpl.type] ?? tmpl.type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {TYPE_DESCRIPTIONS[tmpl.type] ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate italic">
                      Subject: {tmpl.subject}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {tmpl.active ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <XCircle className="h-3.5 w-3.5" />
                        Fallback
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

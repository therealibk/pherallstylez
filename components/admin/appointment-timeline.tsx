import type { AppointmentEventType } from "@/lib/generated/prisma/client";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  CreditCard,
  Bell,
  Plus,
} from "lucide-react";

const EVENT_CONFIG: Record<
  AppointmentEventType,
  { label: string; Icon: React.ComponentType<{ className?: string }>; iconColor: string }
> = {
  CREATED:          { label: "Booking submitted",   Icon: Plus,        iconColor: "#6366f1" },
  CONFIRMED:        { label: "Appointment confirmed",Icon: CheckCircle, iconColor: "#22c55e" },
  CANCELLED:        { label: "Appointment cancelled",Icon: XCircle,     iconColor: "#ef4444" },
  RESCHEDULED:      { label: "Rescheduled",          Icon: RefreshCw,   iconColor: "#0ea5e9" },
  COMPLETED:        { label: "Marked complete",      Icon: CheckCircle, iconColor: "#8b5cf6" },
  NO_SHOW:          { label: "Marked no-show",       Icon: AlertTriangle,iconColor: "#f59e0b" },
  PAYMENT_RECEIVED: { label: "Payment received",     Icon: CreditCard,  iconColor: "#22c55e" },
  PAYMENT_FAILED:   { label: "Payment failed",       Icon: CreditCard,  iconColor: "#ef4444" },
  REFUND_ISSUED:    { label: "Refund issued",        Icon: CreditCard,  iconColor: "#0ea5e9" },
  REMINDER_SENT:    { label: "Reminder sent",        Icon: Bell,        iconColor: "#f59e0b" },
  NOTE_ADDED:       { label: "Note added",           Icon: FileText,    iconColor: "#71717a" },
};

function formatEventTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

interface Event {
  id: string;
  eventType: AppointmentEventType;
  description: string | null;
  metadata: unknown;
  createdAt: Date;
}

interface Props {
  events: Event[];
}

export function AppointmentTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {events.map((event, idx) => {
        const config = EVENT_CONFIG[event.eventType];
        const { Icon, iconColor, label } = config;
        const isLast = idx === events.length - 1;

        return (
          <li key={event.id} className="flex gap-3 group">
            {/* Line + icon */}
            <div className="flex flex-col items-center">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-card"
                style={{ color: iconColor }}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              {!isLast && (
                <div className="mt-1 flex-1 w-px bg-border" style={{ minHeight: "20px" }} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 ${isLast ? "pb-0" : ""} min-w-0 flex-1 pt-0.5`}>
              <p className="text-sm font-medium leading-tight">{label}</p>
              {event.description && (
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed break-words">
                  {event.description}
                </p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                {formatEventTime(event.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

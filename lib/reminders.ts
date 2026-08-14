import { db } from "@/lib/db";
import { sendNotification } from "@/lib/email";
import { AppointmentEventType } from "@/lib/generated/prisma/client";

/**
 * Check all upcoming CONFIRMED appointments and send reminders where due.
 * Idempotent: deduplicationKey prevents duplicate sends even if called multiple times.
 * Safe to run as a cron job.
 */
export async function checkAndSendReminders(): Promise<{ sent: number; skipped: number }> {
  const [settings, businessSettings] = await Promise.all([
    db.bookingSettings.findFirst({ select: { reminderHours: true } }),
    db.businessSettings.findFirst({ select: { businessName: true } }),
  ]);

  const reminderHours = settings?.reminderHours ?? [48, 24];
  const businessName = businessSettings?.businessName ?? "Pherall";

  if (reminderHours.length === 0) return { sent: 0, skipped: 0 };

  const now = new Date();
  const maxHours = Math.max(...reminderHours);
  const lookaheadEnd = new Date(now.getTime() + maxHours * 3_600_000 + 60_000);

  const appointments = await db.appointment.findMany({
    where: {
      status: "CONFIRMED",
      startAt: { gt: now, lte: lookaheadEnd },
    },
    select: {
      id: true,
      startAt: true,
      serviceName: true,
      pricePence: true,
      depositPence: true,
      timezone: true,
      customer: { select: { firstName: true, email: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const appt of appointments) {
    for (const offsetHours of reminderHours) {
      const reminderTime = new Date(appt.startAt.getTime() - offsetHours * 3_600_000);
      if (reminderTime > now) {
        skipped++;
        continue;
      }

      const windowEnd = new Date(reminderTime.getTime() + 60 * 60_000);
      if (now > windowEnd) {
        skipped++;
        continue;
      }

      const deduplicationKey = `APPOINTMENT_REMINDER:${appt.id}:${offsetHours}`;

      try {
        await sendNotification({
          appointmentId: appt.id,
          type: "APPOINTMENT_REMINDER",
          recipientEmail: appt.customer.email,
          deduplicationKey,
          reminderOffsetHours: offsetHours,
          data: {
            customerFirstName: appt.customer.firstName,
            customerEmail: appt.customer.email,
            serviceName: appt.serviceName,
            startAt: appt.startAt,
            timezone: appt.timezone,
            pricePence: appt.pricePence,
            depositPence: appt.depositPence,
            businessName,
            reminderOffsetHours: offsetHours,
          },
        });

        // Record reminder sent event on the appointment for audit trail
        await db.appointmentEvent.create({
          data: {
            appointmentId: appt.id,
            eventType: AppointmentEventType.REMINDER_SENT,
            description: `Reminder sent ${offsetHours}h before appointment`,
            metadata: { offsetHours },
          },
        }).catch(() => {
          // Don't fail if event already recorded
        });

        sent++;
      } catch {
        skipped++;
      }
    }
  }

  return { sent, skipped };
}

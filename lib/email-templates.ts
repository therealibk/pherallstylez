import type { NotificationType } from "@/lib/generated/prisma/client";

function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
}

function formatTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(date);
}

function formatCurrency(pence: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(pence / 100);
}

export interface AppointmentEmailData {
  customerFirstName: string;
  customerEmail: string;
  serviceName: string;
  startAt: Date;
  timezone: string;
  pricePence: number;
  depositPence: number;
  currency?: string;
  businessName: string;
  manageUrl?: string;
  cancellationReason?: string;
  reminderOffsetHours?: number;
}

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 560px;
  margin: 0 auto;
  color: #1a1a1a;
  background: #ffffff;
`;

function emailWrapper(content: string, businessName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="${baseStyle}padding:0 0 40px;">
    <div style="background:#1a1a1a;padding:24px 32px;">
      <p style="margin:0;color:#ffffff;font-size:18px;font-weight:600;letter-spacing:-0.3px;">${businessName}</p>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:0 32px;border-top:1px solid #e4e4e7;margin-top:8px;padding-top:24px;">
      <p style="margin:0;font-size:12px;color:#71717a;">This email was sent by ${businessName}. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

function appointmentSummaryBlock(data: AppointmentEmailData): string {
  const date = formatDate(data.startAt, data.timezone);
  const time = formatTime(data.startAt, data.timezone);
  const price = formatCurrency(data.pricePence, data.currency);
  const deposit = formatCurrency(data.depositPence, data.currency);
  const balance = formatCurrency(data.pricePence - data.depositPence, data.currency);

  return `
    <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">Appointment Details</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;font-size:14px;color:#71717a;width:120px;">Service</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${data.serviceName}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Date</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${date}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Time</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${time}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Price</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${price}</td></tr>
        ${data.depositPence > 0 && data.depositPence < data.pricePence ? `<tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Deposit</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${deposit}</td></tr><tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Balance due</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${balance}</td></tr>` : ""}
      </table>
    </div>`;
}

function manageLink(url: string): string {
  return `
    <p style="margin:24px 0 0;">
      <a href="${url}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:500;">Manage my appointment</a>
    </p>`;
}

export function buildEmailTemplate(
  type: NotificationType,
  data: AppointmentEmailData,
): { subject: string; html: string } {
  switch (type) {
    case "BOOKING_CONFIRMATION": {
      const subject = `Booking received — ${data.serviceName}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Booking received</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${data.customerFirstName},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">Your booking request has been received. We&apos;ll confirm it shortly.</p>
        ${appointmentSummaryBlock(data)}
        ${data.manageUrl ? manageLink(data.manageUrl) : ""}
      `, data.businessName);
      return { subject, html };
    }

    case "PAYMENT_CONFIRMATION": {
      const subject = `Payment confirmed — ${data.serviceName}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Payment confirmed</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${data.customerFirstName},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">Your payment has been confirmed and your appointment is booked.</p>
        ${appointmentSummaryBlock(data)}
        ${data.manageUrl ? manageLink(data.manageUrl) : ""}
      `, data.businessName);
      return { subject, html };
    }

    case "APPOINTMENT_REMINDER": {
      const hours = data.reminderOffsetHours ?? 24;
      const label = hours >= 48 ? `${Math.floor(hours / 24)} days` : `${hours} hours`;
      const subject = `Reminder: your appointment is in ${label}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Appointment reminder</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${data.customerFirstName},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">This is a reminder that your appointment is coming up in <strong>${label}</strong>.</p>
        ${appointmentSummaryBlock(data)}
        ${data.manageUrl ? manageLink(data.manageUrl) : ""}
      `, data.businessName);
      return { subject, html };
    }

    case "CANCELLATION_CONFIRMATION": {
      const subject = `Appointment cancelled — ${data.serviceName}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Appointment cancelled</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${data.customerFirstName},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">Your appointment has been cancelled${data.cancellationReason ? `: ${data.cancellationReason}` : ""}.</p>
        ${appointmentSummaryBlock(data)}
        <p style="margin:20px 0 0;font-size:14px;color:#71717a;">If you have any questions, please get in touch.</p>
      `, data.businessName);
      return { subject, html };
    }

    case "RESCHEDULE_CONFIRMATION": {
      const subject = `Appointment rescheduled — ${data.serviceName}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Appointment rescheduled</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${data.customerFirstName},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">Your appointment has been rescheduled. Here are your updated details:</p>
        ${appointmentSummaryBlock(data)}
        ${data.manageUrl ? manageLink(data.manageUrl) : ""}
      `, data.businessName);
      return { subject, html };
    }

    case "REFUND_CONFIRMATION": {
      const subject = `Refund processed — ${data.serviceName}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Refund processed</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${data.customerFirstName},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">Your refund has been processed. Please allow 5–10 business days for it to appear in your account.</p>
        ${appointmentSummaryBlock(data)}
        <p style="margin:20px 0 0;font-size:14px;color:#71717a;">If you have any questions, please get in touch.</p>
      `, data.businessName);
      return { subject, html };
    }
  }
}

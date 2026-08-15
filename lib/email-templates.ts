import type { NotificationType } from "@/lib/generated/prisma/client";
import { isSafeUrl } from "@/lib/rich-text";
import type { TipTapNode, TipTapMark } from "@/lib/rich-text";

// ── Formatting helpers ─────────────────────────────────────────────────────────

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

// ── Data type ─────────────────────────────────────────────────────────────────

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
  logoUrl?: string | null;
  buttonColor?: string | null;
  buttonTextColor?: string | null;
  manageUrl?: string;
  cancellationReason?: string;
  reminderOffsetHours?: number;
  amountPaidPence?: number;
}

// ── Template variable substitution ────────────────────────────────────────────

export type EmailVars = Record<string, string>;

/**
 * Build the variable map for a given notification type and appointment data.
 * Keys correspond to {{variable_name}} placeholders in CMS template content.
 */
export function buildEmailVars(type: NotificationType, data: AppointmentEmailData): EmailVars {
  const currency = data.currency ?? "GBP";
  const date = formatDate(data.startAt, data.timezone);
  const time = formatTime(data.startAt, data.timezone);
  const total = formatCurrency(data.pricePence, currency);
  const deposit = data.depositPence > 0 ? formatCurrency(data.depositPence, currency) : "";
  const balance =
    data.depositPence > 0 && data.depositPence < data.pricePence
      ? formatCurrency(data.pricePence - data.depositPence, currency)
      : "";
  const amountPaid =
    data.amountPaidPence != null
      ? formatCurrency(data.amountPaidPence, currency)
      : data.depositPence > 0
        ? formatCurrency(data.depositPence, currency)
        : total;

  const hours = data.reminderOffsetHours ?? 24;
  const reminderTime = hours >= 48 ? `${Math.floor(hours / 24)} days` : `${hours} hours`;

  const balanceDueLine =
    balance ? `Balance due at appointment: ${balance}` : "";

  const cancellationReasonLine =
    data.cancellationReason ? `Reason: ${data.cancellationReason}` : "";

  return {
    customer_name: data.customerFirstName,
    customer_email: data.customerEmail,
    service_name: data.serviceName,
    appointment_date: date,
    appointment_time: time,
    total_price: total,
    deposit_amount: deposit,
    balance_due: balance,
    amount_paid: amountPaid,
    manage_booking_url: data.manageUrl ?? "",
    business_name: data.businessName,
    cancellation_reason: data.cancellationReason ?? "",
    cancellation_reason_line: cancellationReasonLine,
    balance_due_line: balanceDueLine,
    reminder_time: reminderTime,
  };
}

/**
 * Substitute {{variable_name}} placeholders in a string.
 * Unknown variables are left as-is (safe — no code execution).
 */
export function substituteVariables(template: string, vars: EmailVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? (vars[key] ?? "") : match;
  });
}

// ── TipTap JSON → email HTML converter ────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyMarks(text: string, marks: TipTapMark[]): string {
  let result = escapeHtml(text);
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `<strong style="font-weight:600;">${result}</strong>`;
        break;
      case "italic":
        result = `<em>${result}</em>`;
        break;
      case "underline":
        result = `<u>${result}</u>`;
        break;
      case "strike":
        result = `<del>${result}</del>`;
        break;
      case "code":
        result = `<code style="font-family:monospace;font-size:13px;background:#f4f4f5;padding:1px 4px;border-radius:3px;">${result}</code>`;
        break;
      case "link": {
        const href = String(mark.attrs?.["href"] ?? "");
        if (isSafeUrl(href)) {
          result = `<a href="${escapeHtml(href)}" style="color:#1a1a1a;text-decoration:underline;">${result}</a>`;
        }
        break;
      }
    }
  }
  return result;
}

function renderNode(node: TipTapNode): string {
  switch (node.type) {
    case "text":
      return applyMarks(node.text ?? "", node.marks ?? []);

    case "paragraph": {
      const inner = (node.content ?? []).map(renderNode).join("");
      if (!inner.trim()) return `<p style="margin:0 0 12px;">&nbsp;</p>`;
      return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">${inner}</p>`;
    }

    case "heading": {
      const level = Number(node.attrs?.["level"] ?? 2);
      const tag = `h${Math.min(Math.max(level, 1), 6)}`;
      const size = level === 1 ? "22px" : level === 2 ? "18px" : "16px";
      const inner = (node.content ?? []).map(renderNode).join("");
      return `<${tag} style="margin:20px 0 8px;font-size:${size};font-weight:600;color:#111827;letter-spacing:-0.3px;">${inner}</${tag}>`;
    }

    case "bulletList": {
      const items = (node.content ?? []).map(renderNode).join("");
      return `<ul style="margin:12px 0;padding-left:24px;">${items}</ul>`;
    }

    case "orderedList": {
      const items = (node.content ?? []).map(renderNode).join("");
      return `<ol style="margin:12px 0;padding-left:24px;">${items}</ol>`;
    }

    case "listItem": {
      const inner = (node.content ?? []).map(renderNode).join("");
      return `<li style="margin-bottom:6px;font-size:15px;line-height:1.6;color:#374151;">${inner}</li>`;
    }

    case "blockquote": {
      const inner = (node.content ?? []).map(renderNode).join("");
      return `<blockquote style="margin:12px 0;padding:12px 16px;border-left:3px solid #e4e4e7;color:#71717a;">${inner}</blockquote>`;
    }

    case "codeBlock": {
      const inner = (node.content ?? []).map(renderNode).join("");
      return `<pre style="margin:12px 0;padding:12px;background:#f4f4f5;border-radius:6px;font-family:monospace;font-size:13px;overflow-x:auto;"><code>${inner}</code></pre>`;
    }

    case "hardBreak":
      return "<br>";

    case "doc":
      return (node.content ?? []).map(renderNode).join("");

    default:
      return (node.content ?? []).map(renderNode).join("");
  }
}

/**
 * Convert rich text content to email-safe HTML.
 * Handles TipTap JSON (legacy), raw HTML (from TinyMCE), and plain text.
 */
export function richTextToEmailHtml(content: string): string {
  if (!content) return "";

  // TipTap JSON
  try {
    const doc = JSON.parse(content) as TipTapNode;
    if (doc.type === "doc" && Array.isArray(doc.content)) {
      return renderNode(doc);
    }
  } catch {
    // not JSON — fall through
  }

  // Raw HTML from TinyMCE — wrap in email-compatible paragraph style and pass through
  if (content.trimStart().startsWith("<") || /<[a-z][\s\S]*>/i.test(content)) {
    return `<div style="font-size:15px;line-height:1.6;color:#374151;">${content}</div>`;
  }

  // Plain text fallback
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(line)}</p>`)
    .join("");
}

// ── Email wrapper ─────────────────────────────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 560px;
  margin: 0 auto;
  color: #1a1a1a;
  background: #ffffff;
`;

export function emailWrapper(
  content: string,
  businessName: string,
  logoUrl?: string | null,
): string {
  const headerHtml = logoUrl
    ? `<div style="padding:20px 32px;border-bottom:1px solid #e4e4e7;">
        <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(businessName)}" style="height:40px;width:auto;max-width:160px;object-fit:contain;display:block;" />
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="${baseStyle}padding:0 0 40px;">
    ${headerHtml}
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:0 32px;border-top:1px solid #e4e4e7;margin-top:8px;padding-top:24px;">
      <p style="margin:0;font-size:12px;color:#71717a;">This email was sent by ${escapeHtml(businessName)}. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

function manageLink(
  url: string,
  buttonColor = "#1a1a1a",
  buttonTextColor = "#ffffff",
): string {
  if (!url || !isSafeUrl(url)) return "";
  const bg = /^#[0-9a-fA-F]{6}$/.test(buttonColor) ? buttonColor : "#1a1a1a";
  const fg = /^#[0-9a-fA-F]{6}$/.test(buttonTextColor) ? buttonTextColor : "#ffffff";
  return `
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(url)}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;font-weight:500;">Manage my appointment</a>
    </p>`;
}

// ── Hardcoded fallback templates ──────────────────────────────────────────────

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
        <tr><td style="padding:6px 0;font-size:14px;color:#71717a;width:120px;">Service</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${escapeHtml(data.serviceName)}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Date</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${date}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Time</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${time}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Price</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${price}</td></tr>
        ${data.depositPence > 0 && data.depositPence < data.pricePence ? `<tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Deposit</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${deposit}</td></tr><tr><td style="padding:6px 0;font-size:14px;color:#71717a;">Balance due</td><td style="padding:6px 0;font-size:14px;font-weight:500;">${balance}</td></tr>` : ""}
      </table>
    </div>`;
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
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${escapeHtml(data.customerFirstName)},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">Your booking request has been received. Payment is required to confirm your appointment.</p>
        ${appointmentSummaryBlock(data)}
        ${data.manageUrl ? manageLink(data.manageUrl, data.buttonColor ?? undefined, data.buttonTextColor ?? undefined) : ""}
      `, data.businessName, data.logoUrl);
      return { subject, html };
    }

    case "PAYMENT_CONFIRMATION": {
      const subject = `Your appointment is confirmed — ${data.serviceName}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Appointment confirmed</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${escapeHtml(data.customerFirstName)},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">Your payment has been confirmed and your appointment is booked.</p>
        ${appointmentSummaryBlock(data)}
        ${data.manageUrl ? manageLink(data.manageUrl, data.buttonColor ?? undefined, data.buttonTextColor ?? undefined) : ""}
      `, data.businessName, data.logoUrl);
      return { subject, html };
    }

    case "APPOINTMENT_REMINDER": {
      const hours = data.reminderOffsetHours ?? 24;
      const label = hours >= 48 ? `${Math.floor(hours / 24)} days` : `${hours} hours`;
      const subject = `Reminder: your appointment is in ${label}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Appointment reminder</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${escapeHtml(data.customerFirstName)},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">This is a reminder that your appointment is coming up in <strong>${label}</strong>.</p>
        ${appointmentSummaryBlock(data)}
        ${data.manageUrl ? manageLink(data.manageUrl, data.buttonColor ?? undefined, data.buttonTextColor ?? undefined) : ""}
      `, data.businessName, data.logoUrl);
      return { subject, html };
    }

    case "CANCELLATION_CONFIRMATION": {
      const subject = `Appointment cancelled — ${data.serviceName}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Appointment cancelled</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${escapeHtml(data.customerFirstName)},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">Your appointment has been cancelled${data.cancellationReason ? `: ${data.cancellationReason}` : ""}.</p>
        ${appointmentSummaryBlock(data)}
        <p style="margin:20px 0 0;font-size:14px;color:#71717a;">If you have any questions, please get in touch.</p>
      `, data.businessName, data.logoUrl);
      return { subject, html };
    }

    case "RESCHEDULE_CONFIRMATION": {
      const subject = `Appointment rescheduled — ${data.serviceName}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Appointment rescheduled</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${escapeHtml(data.customerFirstName)},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">Your appointment has been rescheduled. Here are your updated details:</p>
        ${appointmentSummaryBlock(data)}
        ${data.manageUrl ? manageLink(data.manageUrl, data.buttonColor ?? undefined, data.buttonTextColor ?? undefined) : ""}
      `, data.businessName, data.logoUrl);
      return { subject, html };
    }

    case "REFUND_CONFIRMATION": {
      const subject = `Refund processed — ${data.serviceName}`;
      const html = emailWrapper(`
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;letter-spacing:-0.5px;">Refund processed</h1>
        <p style="margin:0 0 4px;font-size:15px;color:#52525b;">Hi ${escapeHtml(data.customerFirstName)},</p>
        <p style="margin:0;font-size:15px;color:#52525b;">Your refund has been processed. Please allow 5–10 business days for it to appear in your account.</p>
        ${appointmentSummaryBlock(data)}
        <p style="margin:20px 0 0;font-size:14px;color:#71717a;">If you have any questions, please get in touch.</p>
      `, data.businessName, data.logoUrl);
      return { subject, html };
    }
  }
}

// ── CMS template builder ──────────────────────────────────────────────────────

/**
 * Build email HTML from a CMS template (subject + TipTap JSON body) and variable data.
 * Returns null when the template body cannot be rendered (falls back to hardcoded).
 */
export function buildEmailFromCmsTemplate(
  cmsSubject: string,
  cmsBody: string,
  vars: EmailVars,
  businessName: string,
  manageUrl?: string,
  logoUrl?: string | null,
  buttonColor?: string | null,
  buttonTextColor?: string | null,
): { subject: string; html: string } {
  const subject = substituteVariables(cmsSubject, vars);
  const rawHtml = richTextToEmailHtml(cmsBody);
  const bodyHtml = substituteVariables(rawHtml, vars);
  const link = manageUrl && isSafeUrl(manageUrl)
    ? manageLink(manageUrl, buttonColor ?? undefined, buttonTextColor ?? undefined)
    : "";
  const html = emailWrapper(bodyHtml + link, businessName, logoUrl);
  return { subject, html };
}

// ── Available variables reference ─────────────────────────────────────────────

export const EMAIL_TEMPLATE_VARIABLES: Record<NotificationType, string[]> = {
  BOOKING_CONFIRMATION: [
    "{{customer_name}}",
    "{{service_name}}",
    "{{appointment_date}}",
    "{{appointment_time}}",
    "{{total_price}}",
    "{{deposit_amount}}",
    "{{balance_due}}",
    "{{manage_booking_url}}",
    "{{business_name}}",
  ],
  PAYMENT_CONFIRMATION: [
    "{{customer_name}}",
    "{{service_name}}",
    "{{appointment_date}}",
    "{{appointment_time}}",
    "{{total_price}}",
    "{{amount_paid}}",
    "{{deposit_amount}}",
    "{{balance_due}}",
    "{{balance_due_line}}",
    "{{manage_booking_url}}",
    "{{business_name}}",
  ],
  APPOINTMENT_REMINDER: [
    "{{customer_name}}",
    "{{service_name}}",
    "{{appointment_date}}",
    "{{appointment_time}}",
    "{{total_price}}",
    "{{reminder_time}}",
    "{{manage_booking_url}}",
    "{{business_name}}",
  ],
  CANCELLATION_CONFIRMATION: [
    "{{customer_name}}",
    "{{service_name}}",
    "{{appointment_date}}",
    "{{appointment_time}}",
    "{{total_price}}",
    "{{cancellation_reason}}",
    "{{cancellation_reason_line}}",
    "{{business_name}}",
  ],
  RESCHEDULE_CONFIRMATION: [
    "{{customer_name}}",
    "{{service_name}}",
    "{{appointment_date}}",
    "{{appointment_time}}",
    "{{total_price}}",
    "{{manage_booking_url}}",
    "{{business_name}}",
  ],
  REFUND_CONFIRMATION: [
    "{{customer_name}}",
    "{{service_name}}",
    "{{appointment_date}}",
    "{{appointment_time}}",
    "{{total_price}}",
    "{{business_name}}",
  ],
};

// ── Sample preview data ────────────────────────────────────────────────────────

export function buildPreviewVars(businessName: string, appUrl: string): EmailVars {
  return {
    customer_name: "Jane",
    customer_email: "jane.smith@example.com",
    service_name: "Knotless Braids",
    appointment_date: "Monday, 17 August 2026",
    appointment_time: "10:00",
    total_price: "£120.00",
    deposit_amount: "£30.00",
    balance_due: "£90.00",
    balance_due_line: "Balance due at appointment: £90.00",
    amount_paid: "£30.00",
    manage_booking_url: `${appUrl}/manage-booking/example-token`,
    business_name: businessName,
    cancellation_reason: "",
    cancellation_reason_line: "",
    reminder_time: "24 hours",
  };
}

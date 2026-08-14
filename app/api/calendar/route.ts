import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

function icalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcal(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function fold(line: string): string {
  // RFC 5545 — fold lines at 75 octets
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const result: string[] = [];
  let offset = 0;
  let first = true;
  while (offset < bytes.length) {
    const chunk = bytes.slice(offset, offset + (first ? 75 : 74));
    result.push((first ? "" : " ") + new TextDecoder().decode(chunk));
    offset += first ? 75 : 74;
    first = false;
  }
  return result.join("\r\n");
}

export async function GET() {
  const session = await auth();
  if (!session) {
    return new NextResponse("Unauthorised", { status: 401 });
  }

  const [settings, appointments] = await Promise.all([
    db.businessSettings.findFirst({
      select: { businessName: true, timezone: true },
    }),
    db.appointment.findMany({
      where: {
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
        startAt: {
          gte: new Date(Date.now() - 90 * 24 * 3600 * 1000),
          lte: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        },
      },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        serviceName: true,
        status: true,
        notes: true,
        customer: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  const calName = settings?.businessName ?? "Pherall";
  const now = icalDate(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//Pherall//Booking Calendar//EN`,
    `X-WR-CALNAME:${escapeIcal(calName)}`,
    "X-WR-TIMEZONE:UTC",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const appt of appointments) {
    const summary = `${appt.customer.firstName} ${appt.customer.lastName} — ${appt.serviceName}`;
    const description = [
      `Customer: ${appt.customer.firstName} ${appt.customer.lastName}`,
      `Email: ${appt.customer.email}`,
      `Service: ${appt.serviceName}`,
      `Status: ${appt.status}`,
      appt.notes ? `Notes: ${appt.notes}` : null,
    ]
      .filter(Boolean)
      .join("\\n");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:pherall-${appt.id}@pherall`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${icalDate(appt.startAt)}`);
    lines.push(`DTEND:${icalDate(appt.endAt)}`);
    lines.push(`SUMMARY:${escapeIcal(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcal(description)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const body = lines.map(fold).join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="pherall-calendar.ics"`,
      "Cache-Control": "no-store",
    },
  });
}

import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CalendarShell } from "./calendar-shell";

export const metadata: Metadata = { title: "Calendar — Pherall Admin" };

export default async function CalendarPage() {
  const [settings, services] = await Promise.all([
    db.businessSettings.findFirst({ select: { timezone: true } }),
    db.service.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const timezone = settings?.timezone ?? "Europe/London";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="px-4 py-4 sm:px-6 border-b border-border shrink-0">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Schedule, view and manage appointments.</p>
      </div>
      <CalendarShell timezone={timezone} services={services} />
    </div>
  );
}

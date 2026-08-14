import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { db } from "@/lib/db";
import { CalendarGrid } from "./calendar-grid";

export const metadata: Metadata = { title: "Calendar — Pherall Admin" };

async function getMonthAppointments(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const appointments = await db.appointment.findMany({
    where: {
      startAt: { gte: start, lt: end },
      status: { notIn: ["CANCELLED"] },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      status: true,
      startAt: true,
      serviceName: true,
      customer: { select: { firstName: true, lastName: true } },
    },
  });

  return appointments;
}

interface Props {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function CalendarPage({ searchParams }: Props) {
  const params = await searchParams;
  const now = new Date();
  const year = parseInt(params.year ?? String(now.getFullYear()), 10) || now.getFullYear();
  const month = Math.min(12, Math.max(1, parseInt(params.month ?? String(now.getMonth() + 1), 10) || now.getMonth() + 1));

  const appointments = await getMonthAppointments(year, month);

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <PageHeader title="Calendar" description="Monthly overview of all appointments." />
      <CalendarGrid year={year} month={month} appointments={appointments} />
    </div>
  );
}

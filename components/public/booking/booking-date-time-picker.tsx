"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, ArrowRight } from "lucide-react";
import { getAvailableDatesForMonth, getAvailableSlotsForDate } from "@/lib/actions/public-availability";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

interface Props {
  serviceSlug: string;
  initialYear: number;
  initialMonth: number;
  initialAvailableDates: string[];
  timezone: string;
}

export function BookingDateTimePicker({
  serviceSlug,
  initialYear,
  initialMonth,
  initialAvailableDates,
  timezone,
}: Props) {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [availableDates, setAvailableDates] = useState<Set<string>>(
    () => new Set(initialAvailableDates),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isLoadingMonth, startMonthTransition] = useTransition();
  const [isLoadingSlots, startSlotsTransition] = useTransition();

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  function goToPrevMonth() {
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDate(null);
    setSlots([]);
    setSelectedTime(null);
    startMonthTransition(async () => {
      const dates = await getAvailableDatesForMonth(serviceSlug, newYear, newMonth);
      setAvailableDates(new Set(dates));
    });
  }

  function goToNextMonth() {
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;
    setMonth(newMonth);
    setYear(newYear);
    setSelectedDate(null);
    setSlots([]);
    setSelectedTime(null);
    startMonthTransition(async () => {
      const dates = await getAvailableDatesForMonth(serviceSlug, newYear, newMonth);
      setAvailableDates(new Set(dates));
    });
  }

  function handleDayClick(dateStr: string) {
    if (!availableDates.has(dateStr)) return;
    setSelectedDate(dateStr);
    setSelectedTime(null);
    setSlots([]);
    startSlotsTransition(async () => {
      const times = await getAvailableSlotsForDate(serviceSlug, dateStr);
      setSlots(times);
    });
  }

  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfWeek(year, month);
  const cells: (number | null)[] = [
    ...Array<null>(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const canGoPrev = !(year === today.getFullYear() && month <= today.getMonth() + 1);

  const selectedDateDisplay = selectedDate
    ? new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(
        new Date(selectedDate + "T12:00:00Z"),
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div
        className="rounded-2xl border p-5 sm:p-6"
        style={{ borderColor: "var(--border,#e5e7eb)" }}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={goToPrevMonth}
            disabled={!canGoPrev || isLoadingMonth}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <h2
            className="text-base font-semibold tabular-nums"
            style={{ color: "var(--foreground)" }}
          >
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button
            type="button"
            onClick={goToNextMonth}
            disabled={isLoadingMonth}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center mb-2">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/50 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          className={`grid grid-cols-7 gap-1 transition-opacity ${isLoadingMonth ? "opacity-30 pointer-events-none" : ""}`}
          role="grid"
          aria-label={`${MONTH_NAMES[month - 1]} ${year}`}
        >
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} aria-hidden="true" />;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isAvailable = availableDates.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isPast = dateStr < todayStr;
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(dateStr)}
                disabled={!isAvailable || isPast}
                aria-label={`${day} ${MONTH_NAMES[month - 1]}${isAvailable ? ", available" : ", unavailable"}`}
                aria-pressed={isSelected}
                aria-disabled={!isAvailable || isPast}
                className={[
                  "relative h-10 w-full rounded-xl text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
                  isSelected
                    ? "font-semibold text-background"
                    : isAvailable && !isPast
                    ? "hover:bg-muted cursor-pointer"
                    : "text-muted-foreground/30 cursor-default",
                  isToday && !isSelected ? "ring-1 ring-inset ring-muted-foreground/30" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={isSelected ? { background: "var(--foreground)", color: "var(--background)" } : {}}
              >
                {day}
                {isAvailable && !isPast && !isSelected && (
                  <span
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full"
                    style={{ background: "var(--primary,#2d2d2d)", opacity: 0.4 }}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>

        {isLoadingMonth && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            Loading availability…
          </p>
        )}
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div
          className="rounded-2xl border p-5 sm:p-6"
          style={{ borderColor: "var(--border,#e5e7eb)" }}
        >
          <h3
            className="flex items-center gap-2 text-sm font-semibold mb-5"
            style={{ color: "var(--foreground)" }}
          >
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {selectedDateDisplay}
          </h3>

          {isLoadingSlots ? (
            <p className="text-sm text-muted-foreground">Loading available times…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No times available on this date. Please select another day.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map((time) => {
                const isChosen = selectedTime === time;
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    aria-pressed={isChosen}
                    className={[
                      "rounded-xl border py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1",
                      isChosen
                        ? "border-transparent text-background"
                        : "hover:border-foreground/30 hover:bg-muted",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={
                      isChosen
                        ? { background: "var(--foreground)", borderColor: "var(--foreground)", color: "var(--background)" }
                        : { borderColor: "var(--border,#e5e7eb)" }
                    }
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Continue CTA */}
      {selectedDate && selectedTime && (
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl p-5"
          style={{ background: "var(--secondary,#f5f5f5)" }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {selectedTime} · {selectedDateDisplay}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">All times in {timezone}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/book/${serviceSlug}/confirm?date=${selectedDate}&time=${encodeURIComponent(selectedTime)}`,
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shrink-0 transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--button,#1a1a1a)", color: "var(--button-foreground,#fff)" }}
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {!selectedDate && (
        <p className="text-xs text-muted-foreground">
          Select a highlighted date to see available times. All times shown in {timezone}.
        </p>
      )}
    </div>
  );
}

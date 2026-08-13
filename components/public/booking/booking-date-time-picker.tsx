"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  initialMonth: number; // 1-based
  initialAvailableDates: string[]; // YYYY-MM-DD
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

  // Build calendar grid
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfWeek(year, month);
  const cells: (number | null)[] = [
    ...Array<null>(startDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  // Never allow going before current month
  const canGoPrev = !(year === today.getFullYear() && month <= today.getMonth() + 1);

  return (
    <div className="space-y-8">
      {/* Calendar */}
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goToPrevMonth}
            disabled={!canGoPrev || isLoadingMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <h2 className="text-base font-semibold tabular-nums">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            disabled={isLoadingMonth}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 text-center mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-xs font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          className={`grid grid-cols-7 gap-0.5 transition-opacity ${isLoadingMonth ? "opacity-40 pointer-events-none" : ""}`}
          role="grid"
          aria-label={`${MONTH_NAMES[month - 1]} ${year}`}
        >
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} aria-hidden="true" />;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isAvailable = availableDates.has(dateStr);
            const isSelected = selectedDate === dateStr;
            const isPast = dateStr < todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(dateStr)}
                disabled={!isAvailable || isPast}
                aria-label={`${day} ${MONTH_NAMES[month - 1]}`}
                aria-pressed={isSelected}
                aria-disabled={!isAvailable || isPast}
                className={[
                  "h-9 w-full rounded-lg text-sm font-medium transition-colors",
                  isSelected
                    ? "bg-foreground text-background"
                    : isAvailable && !isPast
                    ? "hover:bg-muted cursor-pointer"
                    : "text-muted-foreground/40 cursor-default",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {day}
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

      {/* Time slot grid */}
      {selectedDate && (
        <div className="rounded-xl border bg-card p-4 sm:p-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Available times
            <span className="text-muted-foreground font-normal">
              — {new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date(selectedDate + "T12:00:00Z"))}
            </span>
          </h3>

          {isLoadingSlots ? (
            <p className="text-sm text-muted-foreground">Loading times…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No available times on this date.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {slots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  aria-pressed={selectedTime === time}
                  className={[
                    "rounded-lg border text-sm py-2 px-1 transition-colors font-medium",
                    selectedTime === time
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:bg-muted",
                  ].join(" ")}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Continue */}
      {selectedDate && selectedTime && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="lg"
            onClick={() =>
              router.push(
                `/book/${serviceSlug}/confirm?date=${selectedDate}&time=${encodeURIComponent(selectedTime)}`,
              )
            }
          >
            Continue — {selectedTime} on{" "}
            {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
              new Date(selectedDate + "T12:00:00Z"),
            )}
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        All times shown in {timezone}.
      </p>
    </div>
  );
}

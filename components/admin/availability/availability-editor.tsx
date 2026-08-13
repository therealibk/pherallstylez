"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { saveAvailabilityRules } from "@/lib/actions/availability-rules";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Period {
  startTime: string;
  endTime: string;
}

interface DayConfig {
  open: boolean;
  periods: Period[];
}

type WeekConfig = DayConfig[];

interface ExistingRule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

function buildInitialConfig(existing: ExistingRule[]): WeekConfig {
  return DAY_NAMES.map((_, dow) => {
    const dayRules = existing
      .filter((r) => r.dayOfWeek === dow && r.active)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (dayRules.length === 0) {
      return { open: false, periods: [{ startTime: "09:00", endTime: "17:00" }] };
    }
    return {
      open: true,
      periods: dayRules.map((r) => ({ startTime: r.startTime, endTime: r.endTime })),
    };
  });
}

function emptyPeriod(): Period {
  return { startTime: "09:00", endTime: "17:00" };
}

interface Props {
  initialRules: ExistingRule[];
}

export function AvailabilityEditor({ initialRules }: Props) {
  const [config, setConfig] = useState<WeekConfig>(() =>
    buildInitialConfig(initialRules),
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(dow: number) {
    setConfig((prev) =>
      prev.map((d, i) => (i === dow ? { ...d, open: !d.open } : d)),
    );
    setSaved(false);
  }

  function updatePeriod(dow: number, pi: number, field: keyof Period, value: string) {
    setConfig((prev) =>
      prev.map((d, i) => {
        if (i !== dow) return d;
        const periods = d.periods.map((p, j) =>
          j === pi ? { ...p, [field]: value } : p,
        );
        return { ...d, periods };
      }),
    );
    setSaved(false);
  }

  function addPeriod(dow: number) {
    setConfig((prev) =>
      prev.map((d, i) =>
        i === dow ? { ...d, periods: [...d.periods, emptyPeriod()] } : d,
      ),
    );
    setSaved(false);
  }

  function removePeriod(dow: number, pi: number) {
    setConfig((prev) =>
      prev.map((d, i) => {
        if (i !== dow) return d;
        return { ...d, periods: d.periods.filter((_, j) => j !== pi) };
      }),
    );
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    setSaved(false);

    // Build the rules array from config
    const rules: { dayOfWeek: number; startTime: string; endTime: string; active: boolean }[] = [];
    config.forEach((day, dow) => {
      if (!day.open) return;
      day.periods.forEach((p) => {
        rules.push({ dayOfWeek: dow, startTime: p.startTime, endTime: p.endTime, active: true });
      });
    });

    startTransition(async () => {
      const result = await saveAvailabilityRules(rules);
      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border divide-y">
        {DAY_NAMES.map((name, dow) => {
          const day = config[dow];
          return (
            <div key={dow} className="p-4 space-y-3">
              {/* Day header */}
              <div className="flex items-center gap-3">
                <Switch
                  id={`day-${dow}`}
                  checked={day.open}
                  onCheckedChange={() => toggleDay(dow)}
                  aria-label={`Toggle ${name}`}
                />
                <Label htmlFor={`day-${dow}`} className="w-28 font-medium cursor-pointer">
                  {name}
                </Label>
                {!day.open && (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>

              {/* Time periods */}
              {day.open && (
                <div className="ml-10 space-y-2">
                  {day.periods.map((period, pi) => (
                    <div key={pi} className="flex items-center gap-2 flex-wrap">
                      <Input
                        type="time"
                        value={period.startTime}
                        onChange={(e) => updatePeriod(dow, pi, "startTime", e.target.value)}
                        className="w-32 h-8 text-sm"
                        aria-label={`${name} period ${pi + 1} start time`}
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={period.endTime}
                        onChange={(e) => updatePeriod(dow, pi, "endTime", e.target.value)}
                        className="w-32 h-8 text-sm"
                        aria-label={`${name} period ${pi + 1} end time`}
                      />
                      {day.periods.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePeriod(dow, pi)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          aria-label="Remove period"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {day.periods.length < 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addPeriod(dow)}
                      className="h-7 text-xs text-muted-foreground"
                    >
                      <Plus className="h-3 w-3 mr-1" aria-hidden="true" />
                      Add break
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}
      {saved && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          Availability saved.
        </p>
      )}

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving…" : "Save availability"}
      </Button>
    </div>
  );
}

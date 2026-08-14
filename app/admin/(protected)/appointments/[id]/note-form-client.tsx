"use client";

import { useState, useTransition } from "react";
import { addAppointmentNote } from "@/lib/actions/appointments";

interface Props {
  id: string;
  currentNote: string;
}

export function NoteFormClient({ id, currentNote }: Props) {
  const [note, setNote] = useState(currentNote);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await addAppointmentNote(id, note);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Add internal notes visible only to you…"
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        aria-label="Internal notes"
      />
      <div className="flex items-center justify-between gap-3">
        {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
        {saved && <p className="text-xs text-green-600">Saved</p>}
        {!error && !saved && <span />}
        <button
          type="button"
          onClick={save}
          disabled={isPending || !note.trim()}
          className="rounded-full px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          {isPending ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
}

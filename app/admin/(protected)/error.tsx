"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" aria-hidden="true" />
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        An unexpected error occurred loading this page. Please try again.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-foreground text-background hover:opacity-85 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}

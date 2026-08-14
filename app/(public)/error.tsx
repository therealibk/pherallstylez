"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PublicError]", error);
  }, [error]);

  return (
    <div>
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-xl mx-auto px-6 py-16 md:py-24 text-center">
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Something went wrong
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            An unexpected error occurred. Please try again or return to the homepage.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-85 border-0"
              style={{ background: "var(--foreground)", color: "var(--background)", cursor: "pointer" }}
            >
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold border transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border,#e5e7eb)", color: "var(--foreground)" }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

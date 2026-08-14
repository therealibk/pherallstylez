import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PublicNotFound() {
  return (
    <div>
      <div style={{ background: "var(--secondary,#f5f5f5)" }}>
        <div className="max-w-xl mx-auto px-6 py-16 md:py-24 text-center">
          <p
            className="text-7xl font-bold mb-4"
            style={{ color: "var(--foreground)", opacity: 0.08 }}
            aria-hidden="true"
          >
            404
          </p>
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            Page not found
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-85"
              style={{ background: "var(--foreground)", color: "var(--background)" }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold border transition-opacity hover:opacity-70"
              style={{ borderColor: "var(--border,#e5e7eb)", color: "var(--foreground)" }}
            >
              Browse services
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

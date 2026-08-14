import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-6xl font-bold text-muted-foreground/20 mb-4" aria-hidden="true">404</p>
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-sm text-muted-foreground mb-6">
        This admin page doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to dashboard
      </Link>
    </div>
  );
}

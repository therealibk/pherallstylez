import type { Metadata } from "next";

export const metadata: Metadata = { title: "About — Pherall" };

export default function AboutPage() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">About</h1>
      <p className="mt-4 text-muted-foreground">Content coming soon.</p>
    </section>
  );
}

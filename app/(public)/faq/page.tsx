import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ — Pherall" };

export default function FaqPage() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        Frequently Asked Questions
      </h1>
      <p className="mt-4 text-muted-foreground">FAQs coming soon.</p>
    </section>
  );
}

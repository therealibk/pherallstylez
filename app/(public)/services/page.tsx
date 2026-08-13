import type { Metadata } from "next";

export const metadata: Metadata = { title: "Services — Pherall" };

export default function ServicesPage() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Services</h1>
      <p className="mt-4 text-muted-foreground">Services coming soon.</p>
    </section>
  );
}

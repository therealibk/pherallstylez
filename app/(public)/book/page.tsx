import type { Metadata } from "next";

export const metadata: Metadata = { title: "Book — Pherall" };

export default function BookPage() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Book an Appointment</h1>
      <p className="mt-4 text-muted-foreground">Booking coming soon.</p>
    </section>
  );
}

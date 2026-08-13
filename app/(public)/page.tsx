import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pherall — Professional Hair Styling",
  description: "Book your hair appointment online.",
};

export default function HomePage() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">
        Professional Hair Styling
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-xl">
        Browse services and book your appointment online.
      </p>
      <a
        href="/book"
        className="mt-8 inline-block rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
      >
        Book Now
      </a>
    </section>
  );
}

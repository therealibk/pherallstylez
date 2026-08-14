import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Playfair_Display,
  Lora,
  Cormorant_Garamond,
} from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "Pherall — Professional Hair Styling",
  description: "Professional hair styling and beauty services. Book your appointment online.",
  openGraph: {
    type: "website",
    siteName: "Pherall",
    title: "Pherall — Professional Hair Styling",
    description: "Professional hair styling and beauty services. Book your appointment online.",
    url: appUrl,
  },
  twitter: {
    card: "summary",
    title: "Pherall — Professional Hair Styling",
    description: "Professional hair styling and beauty services. Book your appointment online.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={[
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        playfair.variable,
        lora.variable,
        cormorant.variable,
        "h-full antialiased",
      ].join(" ")}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

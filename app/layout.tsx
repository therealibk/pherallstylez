import type { Metadata } from "next";
import { db } from "@/lib/db";
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

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const FALLBACK_TITLE = "Pherall — Professional Hair Styling";
const FALLBACK_DESCRIPTION = "Professional hair styling and beauty services. Book your appointment online.";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await db.businessSettings.findFirst({
    select: { businessName: true, seoTitle: true, seoDescription: true },
  });

  const title = settings?.seoTitle?.trim() || FALLBACK_TITLE;
  const description = settings?.seoDescription?.trim() || FALLBACK_DESCRIPTION;
  const siteName = settings?.businessName?.trim() || "Pherall";

  return {
    metadataBase: new URL(appUrl),
    title,
    description,
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      url: appUrl,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

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

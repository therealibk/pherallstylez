import Link from "next/link";
import type React from "react";
import { db } from "@/lib/db";
import {
  parseAppearanceData,
  FONT_VAR_NAMES,
  COLOR_VAR_NAMES,
  DEFAULT_COLORS,
} from "@/lib/appearance-schemas";

async function getAppearance() {
  const settings = await db.businessSettings.findFirst({
    select: { appearanceData: true, logoUrl: true, businessName: true },
  });
  const appearance = parseAppearanceData(settings?.appearanceData);
  return {
    appearance,
    logoUrl: settings?.logoUrl ?? null,
    businessName: settings?.businessName ?? "Pherall",
  };
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { appearance, logoUrl, businessName } = await getAppearance();

  // Build CSS custom property overrides safely.
  // Only validated hex values reach this point (parseAppearanceData + schema).
  const cssVars: Record<string, string> = {};

  for (const varName of COLOR_VAR_NAMES) {
    const value = appearance.colors[varName];
    // Re-validate server-side before injection — belt-and-braces
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      cssVars[varName] = value;
    } else {
      cssVars[varName] = DEFAULT_COLORS[varName];
    }
  }

  // Override --font-sans so all font-sans utilities pick up the chosen typeface
  const fontVarName = FONT_VAR_NAMES[appearance.font] ?? FONT_VAR_NAMES.geist;
  cssVars["--font-sans"] = `var(${fontVarName}, ui-sans-serif, system-ui, sans-serif)`;

  return (
    <div
      className="flex flex-col min-h-full"
      style={cssVars as React.CSSProperties}
    >
      <header className="sticky top-0 z-40 border-b bg-[var(--background)]/95 backdrop-blur-sm">
        <nav className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-semibold text-lg tracking-tight">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={businessName}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span>{businessName}</span>
            )}
          </Link>
          <ul className="hidden md:flex gap-7 text-sm font-medium">
            <li>
              <Link href="/services" className="hover:opacity-70 transition-opacity">
                Services
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:opacity-70 transition-opacity">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:opacity-70 transition-opacity">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:opacity-70 transition-opacity">
                FAQ
              </Link>
            </li>
            <li>
              <Link
                href="/book"
                className="rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
                style={{ background: "var(--button)", color: "var(--button-foreground)" }}
              >
                Book Now
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t px-6 py-10 text-sm text-center">
        <p className="opacity-60">
          © {new Date().getFullYear()} {businessName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

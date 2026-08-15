import type React from "react";
import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
import {
  parseAppearanceData,
  FONT_VAR_NAMES,
  COLOR_VAR_NAMES,
  DEFAULT_COLORS,
} from "@/lib/appearance-schemas";
import { PublicNav } from "@/components/public/nav/public-nav";

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

  const cssEntries: string[] = [];

  for (const varName of COLOR_VAR_NAMES) {
    const value = appearance.colors[varName];
    const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_COLORS[varName];
    cssEntries.push(`${varName}:${hex}`);
  }

  const fontVarName = FONT_VAR_NAMES[appearance.font] ?? FONT_VAR_NAMES.geist;
  cssEntries.push(`--font-sans:var(${fontVarName},ui-sans-serif,system-ui,sans-serif)`);

  const cssOverride = `:root{${cssEntries.join(";")}}`;

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: cssOverride }} />
    <div
      className="flex flex-col min-h-full"
    >
      {/* Skip to main content — WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
      >
        Skip to main content
      </a>

      <PublicNav businessName={businessName} logoUrl={logoUrl} />

      <main id="main-content" className="flex-1">{children}</main>

      <footer
        className="mt-auto border-t"
        style={{ borderColor: "var(--border,#e5e7eb)", background: "var(--secondary,#f5f5f5)" }}
      >
        <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            {/* Brand */}
            <div className="shrink-0">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={businessName} className="h-8 w-auto object-contain mb-3" />
              ) : (
                <p className="text-base font-semibold mb-3" style={{ color: "var(--foreground)" }}>
                  {businessName}
                </p>
              )}
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Professional hair styling. Book your appointment online.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                  Navigate
                </p>
                <ul className="space-y-2">
                  {[
                    { href: "/", label: "Home" },
                    { href: "/about", label: "About" },
                    { href: "/services", label: "Services" },
                    { href: "/contact", label: "Contact" },
                    { href: "/faq", label: "FAQ" },
                  ].map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
                  Legal
                </p>
                <ul className="space-y-2">
                  {[
                    { href: "/privacy-policy", label: "Privacy Policy" },
                    { href: "/terms-and-conditions", label: "Terms & Conditions" },
                    { href: "/booking-policy", label: "Booking Policy" },
                    { href: "/cancellation-policy", label: "Cancellation Policy" },
                  ].map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div
            className="mt-10 pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t"
            style={{ borderColor: "var(--border,#e5e7eb)" }}
          >
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {businessName}. All rights reserved.
            </p>
            <Link
              href="/book"
              className="text-xs font-semibold transition-opacity hover:opacity-75 self-start sm:self-auto"
              style={{ color: "var(--primary,#2d2d2d)" }}
            >
              Book an appointment →
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}

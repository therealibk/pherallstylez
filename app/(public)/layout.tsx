import type React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
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

  const cssVars: Record<string, string> = {};

  for (const varName of COLOR_VAR_NAMES) {
    const value = appearance.colors[varName];
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      cssVars[varName] = value;
    } else {
      cssVars[varName] = DEFAULT_COLORS[varName];
    }
  }

  const fontVarName = FONT_VAR_NAMES[appearance.font] ?? FONT_VAR_NAMES.geist;
  cssVars["--font-sans"] = `var(${fontVarName}, ui-sans-serif, system-ui, sans-serif)`;

  return (
    <div
      className="flex flex-col min-h-full"
      style={cssVars as React.CSSProperties}
    >
      <PublicNav businessName={businessName} logoUrl={logoUrl} />

      <main className="flex-1">{children}</main>

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
  );
}

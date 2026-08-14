"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

interface Props {
  businessName: string;
  logoUrl: string | null;
}

export function PublicNav({ businessName, logoUrl }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const close = () => setOpen(false);

  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={businessName} className="h-7 w-auto object-contain" />
  ) : (
    <span className="font-semibold tracking-tight text-base" style={{ color: "var(--foreground)" }}>
      {businessName}
    </span>
  );

  const drawer =
    typeof document !== "undefined" && open
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] flex"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={close}
              aria-hidden="true"
            />
            <div
              className="relative ml-auto w-72 max-w-[85vw] h-full flex flex-col overflow-y-auto shadow-2xl"
              style={{ background: "var(--background)" }}
            >
              <div
                className="flex items-center justify-between px-6 py-5 border-b shrink-0"
                style={{ borderColor: "var(--border,#e5e7eb)" }}
              >
                <Link href="/" className="shrink-0" onClick={close}>
                  {logo}
                </Link>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-black/5"
                  aria-label="Close menu"
                  onClick={close}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1" aria-label="Mobile navigation">
                {NAV_LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      pathname === href
                        ? "bg-black/5 font-semibold"
                        : "hover:bg-black/5",
                    )}
                    style={{ color: "var(--foreground)" }}
                    aria-current={pathname === href ? "page" : undefined}
                    onClick={close}
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <div className="px-4 pb-8 shrink-0">
                <Link
                  href="/book"
                  className="flex items-center justify-center w-full rounded-full py-3 text-sm font-semibold transition-opacity hover:opacity-85"
                  style={{ background: "var(--button,#1a1a1a)", color: "var(--button-foreground,#fff)" }}
                  onClick={close}
                >
                  Book Now
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 transition-shadow",
          scrolled ? "shadow-sm" : "",
        )}
        style={{ background: "var(--background)" }}
      >
        {/* Thin accent line at top */}
        <div className="h-px w-full" style={{ background: "var(--primary,#2d2d2d)", opacity: 0.12 }} />

        <nav
          className="mx-auto max-w-6xl px-6 py-0 flex items-center h-16 justify-between"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 rounded"
          >
            {logo}
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-1" role="list">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "relative px-3 py-2 text-sm font-medium rounded-md transition-colors block",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-black/4",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {label}
                    {active && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                        style={{ background: "var(--primary,#2d2d2d)" }}
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/book"
              className="rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: "var(--button,#1a1a1a)", color: "var(--button-foreground,#fff)" }}
            >
              Book Now
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </nav>
      </header>

      {drawer}
    </>
  );
}

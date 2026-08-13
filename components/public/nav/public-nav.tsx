"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

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

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt={businessName} className="h-8 w-auto object-contain" />
  ) : (
    <span>{businessName}</span>
  );

  // open starts false, so this is null on SSR — no hydration mismatch
  const drawer = (typeof document !== "undefined" && open)
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={close}
            aria-hidden="true"
          />

          {/* Slide-in panel from the right */}
          <div className="relative ml-auto w-72 max-w-[85vw] h-full bg-white shadow-xl flex flex-col overflow-y-auto">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <Link
                href="/"
                className="font-semibold text-lg tracking-tight"
                onClick={close}
              >
                {logo}
              </Link>
              <button
                type="button"
                className="flex items-center justify-center h-10 w-10 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
                onClick={close}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 px-4 py-6 space-y-1" aria-label="Mobile navigation">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center px-4 py-3 rounded-lg text-base font-medium hover:bg-gray-100 transition-colors"
                  aria-current={pathname === href ? "page" : undefined}
                  onClick={close}
                >
                  {label}
                </Link>
              ))}

              {/* Book CTA */}
              <div className="pt-4 px-4">
                <Link
                  href="/book"
                  className="flex items-center justify-center w-full rounded-full py-3 text-base font-semibold transition-opacity hover:opacity-85"
                  style={{ background: "var(--button,#1a1a1a)", color: "var(--button-foreground,#fff)" }}
                  aria-current={pathname === "/book" ? "page" : undefined}
                  onClick={close}
                >
                  Book Now
                </Link>
              </div>
            </nav>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <header className="sticky top-0 z-40 border-b backdrop-blur-sm" style={{ background: "var(--background,#fff)" }}>
        <nav
          className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between"
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 font-semibold text-lg tracking-tight shrink-0"
          >
            {logo}
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-7 text-sm font-medium" role="list">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="hover:opacity-70 transition-opacity"
                  aria-current={pathname === href ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/book"
                className="rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
                style={{ background: "var(--button,#1a1a1a)", color: "var(--button-foreground,#fff)" }}
                aria-current={pathname === "/book" ? "page" : undefined}
              >
                Book Now
              </Link>
            </li>
          </ul>

          {/* Mobile hamburger — only visible below md */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-md hover:bg-gray-100 transition-colors"
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

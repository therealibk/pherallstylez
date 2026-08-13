import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <header className="border-b px-6 py-4">
        <nav className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">
            Pherall
          </Link>
          <ul className="flex gap-6 text-sm">
            <li>
              <Link href="/services">Services</Link>
            </li>
            <li>
              <Link href="/about">About</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <Link href="/faq">FAQ</Link>
            </li>
            <li>
              <Link href="/book" className="font-medium">
                Book Now
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t px-6 py-8 text-sm text-center text-muted-foreground">
        <p>© {new Date().getFullYear()} Pherall. All rights reserved.</p>
      </footer>
    </div>
  );
}

// Next.js App Router requires 'unsafe-inline' for its hydration scripts and Tailwind inline styles.
// The high-value directives below (frame-ancestors, base-uri, form-action, object-src) provide
// meaningful protection regardless. Upgrade to nonce-based CSP if stricter script-src is needed.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.tiny.cloud",
  "style-src 'self' 'unsafe-inline' https://cdn.tiny.cloud",
  "img-src 'self' data: blob: https://cdn.tiny.cloud",
  "font-src 'self' https://cdn.tiny.cloud",
  "connect-src 'self' https://cdn.tiny.cloud",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/api/favicon",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        // HTML pages must not be cached by reverse proxies — stale HTML points to
        // outdated CSS hashes after a new build, causing a flash of unstyled content.
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
      {
        // Next.js hashed static assets can be cached forever
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;

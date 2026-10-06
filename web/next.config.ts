import type { NextConfig } from "next";

/**
 * Content Security Policy, report-only for now: it states where the browser
 * may connect (this site, the two AI providers for bring-your-own-key calls,
 * and the OpenFreeMap tiles), so the promise that a visitor's AI key only ever
 * goes to the provider they chose is checked by the browser, not just by code
 * review. Violations are posted to /api/csp-report. Switch to an enforced
 * `Content-Security-Policy` once it has run cleanly in production.
 * Production only: `next dev` needs eval for fast refresh.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.anthropic.com https://api.openai.com https://tiles.openfreemap.org",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "report-uri /api/csp-report",
].join("; ");

const nextConfig: NextConfig = {
  // libSQL ships native bindings; keep it out of the server bundle.
  serverExternalPackages: ["@libsql/client", "libsql"],
  // The seed snapshot is copied to /tmp on Vercel when no DATABASE_URL is set;
  // drizzle/ migrations are bundled for completeness.
  outputFileTracingIncludes: {
    "/**": [
      "./data/seed.db",
      "./drizzle/**/*",
      "./public/data/basemap.geojson",
      "./content/docs/**/*",
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Content-Security-Policy-Report-Only", value: CSP }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;

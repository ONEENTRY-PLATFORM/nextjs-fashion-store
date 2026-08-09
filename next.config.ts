import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production';

/** OneEntry origin, so the policy follows the tenant instead of hardcoding it. */
const oneEntryOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_ONEENTRY_URL ?? process.env.ONEENTRY_URL ?? '';
  try {
    return raw ? new URL(raw).origin : '';
  } catch {
    return '';
  }
})();

/**
 * Content-Security-Policy.
 *
 * `script-src` has to keep `'unsafe-inline'`: the App Router streams its RSC
 * payload through inline `<script>` tags, and the nonce-based alternative
 * requires per-request rendering — which would take every ISR page back to
 * dynamic. So the policy is not aimed at *blocking script execution*; it is
 * aimed at the step after it.
 *
 * That is where the value is, given the shopper session now lives in
 * `localStorage`: `connect-src`, `img-src` and `form-action` fence in every
 * channel injected code could use to ship a stolen token off-origin, and
 * `base-uri` blocks the `<base href>` rewrite trick. Paired with the
 * allow-list sanitizer on CMS rich text (`src/lib/sanitize-html.ts`), that
 * covers both halves: getting script in, and getting data out.
 */
const cspDirectives: Array<[string, string[]]> = [
  ['default-src', ["'self'"]],
  // `'unsafe-eval'` is a dev-only requirement of React Fast Refresh.
  ['script-src', ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])]],
  ['style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']],
  ['font-src', ["'self'", 'data:', 'https://fonts.gstatic.com']],
  ['img-src', ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://*.oneentry.cloud']],
  ['connect-src', ["'self'", 'https://*.oneentry.cloud', 'wss://*.oneentry.cloud',
    ...(oneEntryOrigin ? [oneEntryOrigin] : []),
    // The dev server talks to itself over ws for HMR.
    ...(isDev ? ['ws:', 'http://localhost:*'] : [])]],
  ['frame-src', ["'none'"]],
  ['object-src', ["'none'"]],
  ['base-uri', ["'self'"]],
  ['form-action', ["'self'"]],
  ['frame-ancestors', ["'none'"]],
  ['upgrade-insecure-requests', []],
];

const contentSecurityPolicy = cspDirectives
  .map(([name, values]) => (values.length > 0 ? `${name} ${values.join(' ')}` : name))
  .join('; ');

/** Hardening headers applied to every route. */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Redundant with `frame-ancestors` on modern browsers, cheap insurance elsewhere.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Tree-shake the bulky icon / UI packages so route bundles only ship the
  // icons they actually import. Trimmed ~200 KB from first-load JS on the
  // homepage in earlier profiling.
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid',
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/images/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
    ];
  },
  images: {
    // Image optimization stays OFF. Originally disabled because `/_next/image`
    // aborted a significant fraction of concurrent requests in production
    // (client-side ERR_ABORTED); re-measured on a prod build after CMS pictures
    // gained an LQIP, and the bottleneck is still there:
    //
    //   cold cache   — 13 of 28 photos transcoded within 30s (0 non-200)
    //   warm, twice  — 24 of 28 within 12s, no failures
    //   4 parallel browser contexts — every page load times out
    //
    // The optimizer re-encodes 1440×2160 originals on demand, so a catalog page
    // serialises behind it. What it would have bought — AVIF/WebP and a real
    // `srcset` for the `sizes` hints the call sites declare — is worth less
    // than the stall, especially now that the blur placeholder covers the wait
    // that made unoptimized loading look broken in the first place.
    //
    // Flipping this to `false` is a one-line change and the blur works either
    // way; if you do, cap Playwright workers too, or the image E2E flakes.
    //
    // Note it really is all-or-nothing: `unoptimized: true` here disables the
    // optimizer outright, and a per-image `unoptimized={false}` does *not*
    // buy its way back in (verified on Next 16 — the prop only overrides in
    // the other direction). `remotePatterns` stays because it is what the
    // config would need the moment this flag flips.
    //
    // The cost is currently paid by the homepage hero: a ~575 KB 1600 px JPEG
    // painted into a 412 px viewport, which is most of the simulated LCP on a
    // throttled connection. The cheaper fix is CMS-side — re-uploading those
    // block images through an OE preview template gives `previewLink` a
    // resized variant to serve (and an LQIP with it), no optimizer involved.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.oneentry.cloud',
      },
    ],
  },
}

export default nextConfig

import { type NextRequest,NextResponse } from 'next/server';

import {
  DEFAULT_SHORT_LOCALE,
  hasLocale,
  IS_MULTI_LOCALE,
  SHORT_LOCALES,
} from './src/lib/oneentry/locale';

/**
 * Locale routing, "as-needed" scheme.
 *
 * Routes live under `app/[locale]/`, but the default locale must keep its
 * bare URLs — `/cart`, not `/en/cart` — so that switching a second locale on
 * does not move a single existing page. Two rules do that:
 *
 * 1. A path with no locale segment is **rewritten** to the default locale.
 *    A rewrite, not a redirect: the shopper's URL stays `/cart` while Next
 *    renders `app/[locale]/cart` with `locale = "en"`.
 * 2. A path that explicitly carries the default locale is **redirected**
 *    (308) to the bare form, so `/en/cart` and `/cart` never both serve the
 *    same content — a canonical-URL duplicate is a real SEO cost.
 *
 * Non-default locales pass through untouched: `/fr/cart` already matches the
 * route it needs.
 *
 * On a single-locale deployment `IS_MULTI_LOCALE` is false and this collapses
 * to rule 1 alone, which is a pure rewrite — behaviour identical to having no
 * locale routing at all.
 *
 * The locale list is a build-time snapshot of the OneEntry project settings
 * (`src/lib/oneentry/locales.generated.ts`, written by
 * `.claude/temp/gen-locales.mjs`) rather than a live CMS read: this runs at the
 * edge on every request and cannot call the CMS. See
 * `src/lib/oneentry/locale.ts`.
 * @param   {NextRequest}  request - Incoming request.
 * @returns {NextResponse}         Rewrite, redirect, or pass-through.
 */
/**
 * `/product/<id>` where `<id>` is not a positive integer.
 *
 * Rejected here rather than in the route, because the route cannot reject it cheaply: it streams
 * (there is a `loading.tsx` above it), so its `notFound()` lands after the 200 has gone out and
 * Vercel stores the render as an ISR entry all the same. A `/product/` path has one shape, and an
 * id-shaped guard at the edge means a crawler inventing ids cannot mint cache entries with them.
 */
const BOGUS_PRODUCT_PATH = /^(?:\/[a-z]{2})?\/product\/(?!\d+$).+$/i;

/**
 * Body for the edge-level 404. Deliberately minimal and not editor-owned: no CMS read is possible
 * at the edge, and this answers URLs no storefront link points at. Shoppers who mistype reach the
 * real, CMS-driven not-found page through every other route; this one is for id-fuzzing crawlers.
 */
const EDGE_NOT_FOUND_BODY =
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>404 — Not Found</title>' +
  '<meta name="robots" content="noindex,nofollow"></head>' +
  '<body><h1 data-testid="not-found-heading">404 — Not Found</h1><p><a href="/">Home</a></p></body></html>';

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split('/')[1] ?? '';

  if (BOGUS_PRODUCT_PATH.test(pathname)) {
    return new NextResponse(EDGE_NOT_FOUND_BODY, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }) as NextResponse;
  }

  // `/en/...` → `/...` — collapse the redundant default prefix.
  if (IS_MULTI_LOCALE && firstSegment === DEFAULT_SHORT_LOCALE) {
    const rest = pathname.slice(`/${DEFAULT_SHORT_LOCALE}`.length) || '/';
    const url = request.nextUrl.clone();
    url.pathname = rest;
    // 308 keeps the method and tells crawlers the move is permanent.
    return NextResponse.redirect(url, 308);
  }

  // `/fr/...` — already addresses the right route.
  if (hasLocale(firstSegment)) {
    return NextResponse.next();
  }

  // Bare path — render it as the default locale without changing the URL.
  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_SHORT_LOCALE}${pathname === '/' ? '' : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  /**
   * Everything except Next internals, the API surface, and the root-level
   * metadata files, which must keep serving from their canonical bare paths
   * (`/sitemap.xml`, `/robots.txt`, …) and carry no locale of their own.
   *
   * `/auth/callback/google` is deliberately **included**: the OAuth provider
   * redirects to a fixed registered URI, and the rewrite is what lets that
   * bare URL keep working now that the page lives under `app/[locale]/`.
   * A redirect there would drop the `?code=` exchange.
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|icon\\.svg|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|llms\\.txt|opengraph-image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|txt|xml|json|webmanifest)$).*)',
  ],
};

/** Locale codes this proxy routes — exported for tests. */
export const ROUTED_LOCALES = SHORT_LOCALES;

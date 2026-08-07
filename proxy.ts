import { NextResponse, type NextRequest } from 'next/server';
import {
  DEFAULT_SHORT_LOCALE,
  IS_MULTI_LOCALE,
  SHORT_LOCALES,
  hasLocale,
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
 * The locale list comes from `NEXT_PUBLIC_LOCALES` rather than OneEntry: this
 * runs at the edge on every request and cannot call the CMS. See
 * `src/lib/oneentry/locale.ts`.
 * @param   {NextRequest}  request - Incoming request.
 * @returns {NextResponse}         Rewrite, redirect, or pass-through.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split('/')[1] ?? '';

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

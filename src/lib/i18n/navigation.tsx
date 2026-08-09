'use client';

import NextLink from 'next/link';
import { usePathname, useRouter as useNextRouter } from 'next/navigation';
import { type ComponentProps, useCallback, useMemo } from 'react';

import {
  DEFAULT_SHORT_LOCALE,
  localeFromPath,
  localizeHref,
  type ShortLocaleCode,
  stripLocale,
} from '../oneentry/locale';

/**
 * Locale-aware navigation for Client Components.
 *
 * Every internal link has to carry the active locale, and doing that by hand at
 * ~60 call sites is a rule nobody remembers six months later. These wrappers
 * make it structural instead: import `Link` / `useRouter` from here and the
 * prefix is applied for you, so a link written without a thought still keeps
 * the shopper in their language.
 *
 * The locale is derived from `usePathname()` rather than a context, because the
 * proxy *rewrites* rather than redirects the default locale — the browser URL
 * is the source of truth for which locale is on screen (`/cart` → default,
 * `/fr/cart` → French), and no provider has to be mounted for it to work.
 */

/**
 * Active locale for the current URL. `/cart` → the default, `/fr/cart` → `fr`.
 *
 * @returns Short locale code.
 */
export function useLocale(): ShortLocaleCode {
  const pathname = usePathname();
  return useMemo(() => localeFromPath(pathname ?? '/'), [pathname]);
}

/** Current path with any locale prefix removed — the locale-agnostic route. */
export function usePathnameWithoutLocale(): string {
  const pathname = usePathname();
  return useMemo(() => stripLocale(pathname ?? '/'), [pathname]);
}

/**
 * `next/link` that keeps the shopper in their locale.
 *
 * External URLs, anchors and `mailto:`/`tel:` pass through untouched — see
 * `localizeHref`. Under the default locale the href is returned verbatim, so
 * markup and rendered output are unchanged on a single-locale deployment.
 *
 * @param    props      - Same props as `next/link`.
 * @param    props.href - App-relative or absolute href.
 * @returns          A locale-prefixed link.
 */
export function Link({ href, ...rest }: ComponentProps<typeof NextLink>): React.JSX.Element {
  const locale = useLocale();
  const localized = typeof href === 'string' ? localizeHref(href, locale) : href;
  return <NextLink href={localized} {...rest} />;
}

/** The subset of `next/navigation`'s router this app uses, locale-aware. */
interface LocaleRouter {
  push: (href: string, options?: { scroll?: boolean }) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (href: string) => void;
}

/**
 * `useRouter` whose `push`/`replace`/`prefetch` prefix the active locale.
 *
 * `back`, `forward` and `refresh` are passed straight through — they operate on
 * history, not on hrefs.
 *
 * @returns Locale-aware router.
 */
export function useRouter(): LocaleRouter {
  const router = useNextRouter();
  const locale = useLocale();

  const push = useCallback(
    (href: string, options?: { scroll?: boolean }) => router.push(localizeHref(href, locale), options),
    [router, locale],
  );
  const replace = useCallback(
    (href: string, options?: { scroll?: boolean }) => router.replace(localizeHref(href, locale), options),
    [router, locale],
  );
  const prefetch = useCallback((href: string) => router.prefetch(localizeHref(href, locale)), [router, locale]);

  return useMemo(
    () => ({
      push,
      replace,
      prefetch,
      back: () => router.back(),
      forward: () => router.forward(),
      refresh: () => router.refresh(),
    }),
    [push, replace, prefetch, router],
  );
}

/**
 * Href for the same page in another locale — what the language switcher needs.
 *
 * @param pathname - Current path, prefix included or not.
 * @param target   - Locale to switch to.
 * @returns          Path under the target locale.
 */
export function switchLocaleHref(pathname: string, target: ShortLocaleCode): string {
  return localizeHref(stripLocale(pathname || '/'), target || DEFAULT_SHORT_LOCALE);
}

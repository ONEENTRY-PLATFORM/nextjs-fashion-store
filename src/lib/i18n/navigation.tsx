'use client';

import NextLink from 'next/link';
import { usePathname, useRouter as useNextRouter } from 'next/navigation';
import { type ComponentProps, useCallback, useMemo } from 'react';

import { useTransitionNavigate } from '@/app/components/system/TransitionNavigationContext';
import {
  DEFAULT_SHORT_LOCALE,
  localeFromPath,
  localizeHref,
  type ShortLocaleCode,
  stripLocale,
} from '@/lib/oneentry/locale';

/** Locale-aware navigation for Client Components. */

/** Active locale for the current URL. */
export function useLocale(): ShortLocaleCode {
  const pathname = usePathname();
  return useMemo(() => localeFromPath(pathname ?? '/'), [pathname]);
}

/** Current path with any locale prefix removed — the locale-agnostic route. */
export function usePathnameWithoutLocale(): string {
  const pathname = usePathname();
  return useMemo(() => stripLocale(pathname ?? '/'), [pathname]);
}

/** `next/link` that keeps the shopper in their locale. */
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

/** `useRouter` whose `push`/`replace`/`prefetch` prefix the active locale. */
export function useRouter(): LocaleRouter {
  const router = useNextRouter();
  const locale = useLocale();
  // Present whenever `<TransitionProvider>` is mounted (i.e. in the app), so a programmatic `push` fades the page out and in exactly like a link click.
  const animatedNavigate = useTransitionNavigate();

  const push = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      const target = localizeHref(href, locale);
      if (animatedNavigate) {
        animatedNavigate(target, options, 'push');
        return;
      }
      router.push(target, options);
    },
    [animatedNavigate, router, locale],
  );
  const replace = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      const target = localizeHref(href, locale);
      if (animatedNavigate) {
        animatedNavigate(target, options, 'replace');
        return;
      }
      router.replace(target, options);
    },
    [animatedNavigate, router, locale],
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

/** Href for the same page in another locale — what the language switcher needs. */
export function switchLocaleHref(pathname: string, target: ShortLocaleCode): string {
  return localizeHref(stripLocale(pathname || '/'), target || DEFAULT_SHORT_LOCALE);
}

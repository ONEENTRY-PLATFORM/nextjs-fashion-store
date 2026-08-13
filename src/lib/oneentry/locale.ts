/** Locale model for the storefront. */

import { GENERATED_CMS_LOCALES } from './locales.generated';

/** OE locale code, e.g. `en_US`. */
export type CmsLocaleCode = string;

/** URL-facing locale code, e.g. `en`. */
export type ShortLocaleCode = string;

/** Single source of truth for the default OneEntry locale used across all fetchers, and the one locale that renders without a URL prefix. */
export const DEFAULT_LOCALE: CmsLocaleCode = 'en_US';

/** Every locale the storefront routes for, in display order, as CMS codes. */
export const CMS_LOCALES: readonly CmsLocaleCode[] = [
  DEFAULT_LOCALE,
  ...GENERATED_CMS_LOCALES.filter((l) => l !== DEFAULT_LOCALE),
];

/** `en_US` → `en`. Anything without an underscore passes through unchanged. */
export function toShortCode(cms: CmsLocaleCode): ShortLocaleCode {
  const [head] = cms.split('_');
  return (head ?? cms).toLowerCase();
}

/** Every routable locale as a URL short code, default first. */
export const SHORT_LOCALES: readonly ShortLocaleCode[] = CMS_LOCALES.map(toShortCode);

/** The short code that renders without a prefix. */
export const DEFAULT_SHORT_LOCALE: ShortLocaleCode = toShortCode(DEFAULT_LOCALE);

/** Whether the storefront routes more than one locale. */
export const IS_MULTI_LOCALE = CMS_LOCALES.length > 1;

/** `en` → `en_US`. Unknown codes resolve to the default rather than throwing. */
export function toCmsLocale(short: string | undefined): CmsLocaleCode {
  if (!short) return DEFAULT_LOCALE;
  const lower = short.toLowerCase();
  return CMS_LOCALES.find((cms) => toShortCode(cms) === lower) ?? DEFAULT_LOCALE;
}

/** Type guard for a routable short code. */
export function hasLocale(short: string | undefined): short is ShortLocaleCode {
  return typeof short === 'string' && SHORT_LOCALES.includes(short.toLowerCase());
}

/** Prefix an app-relative href for the given locale, honouring the as-needed scheme: the default locale is returned untouched. */
export function localizeHref(href: string, short: ShortLocaleCode): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  if (!hasLocale(short)) return href;
  // Strip first, unconditionally: switching *to* the default has to remove an existing prefix (`/fr/cart` → `/cart`), not just skip adding one.
  const stripped = stripLocale(href);
  if (short === DEFAULT_SHORT_LOCALE) return stripped;
  return stripped === '/' ? `/${short}` : `/${short}${stripped}`;
}

/** Drop a leading locale segment, if present. */
export function stripLocale(pathname: string): string {
  const match = /^\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!match) return pathname;
  if (!hasLocale(match[1])) return pathname;
  return match[2] || '/';
}

/** The locale segment of a path, or the default when there is none — which is exactly the as-needed case. */
export function localeFromPath(pathname: string): ShortLocaleCode {
  const first = /^\/([^/]+)/.exec(pathname)?.[1];
  return hasLocale(first) ? first.toLowerCase() : DEFAULT_SHORT_LOCALE;
}

/** BCP-47 tag for the `<html lang>` attribute and hreflang, derived from the CMS code: `en_US` → `en-US`. Search engines and screen readers expect the hyphen form. */
export function htmlLang(short: ShortLocaleCode): string {
  return toCmsLocale(short).replace('_', '-');
}

/** `alternates.languages` for Next metadata: one absolute URL per routed locale plus `x-default`. Under the as-needed scheme the default locale's alternate is the bare URL, which is also what `x-default` points at. */
export function buildLanguageAlternates(baseUrl: string, path: string = '/'): Record<string, string> {
  const origin = baseUrl.replace(/\/$/, '');
  const bare = stripLocale(path) || '/';
  const out: Record<string, string> = {};
  for (const short of SHORT_LOCALES) {
    const localized = localizeHref(bare, short);
    out[htmlLang(short)] = `${origin}${localized === '/' ? '' : localized}`;
  }
  out['x-default'] = `${origin}${bare === '/' ? '' : bare}`;
  return out;
}

/** @deprecated Use {@link CmsLocaleCode}. Kept so existing imports compile. */
export type Locale = CmsLocaleCode;

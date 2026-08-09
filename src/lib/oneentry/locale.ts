/**
 * Locale model for the storefront.
 *
 * Two spellings of the same thing travel through the app and must not be
 * confused:
 *
 * - **CMS code** — what OneEntry speaks: `en_US`, `fr_FR`. Every SDK call takes
 *   this one.
 * - **Short code** — what the URL shows: `en`, `fr`. Chosen over the full code
 *   because `/fr/cart` reads better than `/fr_FR/cart` and matches what
 *   shoppers see elsewhere.
 *
 * URL scheme is **as-needed**: the default locale carries no prefix at all
 * (`/cart`), every other locale is prefixed (`/fr/cart`). That is what keeps
 * today's English URLs — and their search rankings — untouched when a second
 * locale is switched on.
 *
 * The active list comes from `NEXT_PUBLIC_LOCALES` rather than from OneEntry,
 * because `proxy.ts` runs on every request at the edge and cannot call the CMS.
 * Enabling a locale is therefore: turn it on in the admin panel, add its code
 * to that variable, redeploy. `generateStaticParams` reads the same list, so
 * the routes appear on the next build with no code change.
 */

/** OE locale code, e.g. `en_US`. */
export type CmsLocaleCode = string;

/** URL-facing locale code, e.g. `en`. */
export type ShortLocaleCode = string;

/**
 * Single source of truth for the default OneEntry locale used across all
 * fetchers, and the one locale that renders without a URL prefix.
 *
 * Overridable via `NEXT_PUBLIC_DEFAULT_LOCALE` at build time.
 */
export const DEFAULT_LOCALE: CmsLocaleCode = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en_US';

/**
 * Every locale the storefront routes for, in display order, as CMS codes.
 *
 * Defaults to just the default locale, which reproduces the single-locale
 * behaviour exactly: no prefixes anywhere, nothing to switch.
 */
export const CMS_LOCALES: readonly CmsLocaleCode[] = (() => {
  const raw = process.env.NEXT_PUBLIC_LOCALES ?? '';
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const list = parsed.length > 0 ? parsed : [DEFAULT_LOCALE];
  // The default must always be routable, and must come first so it wins any
  // "pick the first" fallback.
  return [DEFAULT_LOCALE, ...list.filter((l) => l !== DEFAULT_LOCALE)];
})();

/**
 * `en_US` → `en`. Anything without an underscore passes through unchanged.
 */
export function toShortCode(cms: CmsLocaleCode): ShortLocaleCode {
  const [head] = cms.split('_');
  return (head ?? cms).toLowerCase();
}

/** Every routable locale as a URL short code, default first. */
export const SHORT_LOCALES: readonly ShortLocaleCode[] = CMS_LOCALES.map(toShortCode);

/** The short code that renders without a prefix. */
export const DEFAULT_SHORT_LOCALE: ShortLocaleCode = toShortCode(DEFAULT_LOCALE);

/** Whether the storefront routes more than one locale. Drives the switcher. */
export const IS_MULTI_LOCALE = CMS_LOCALES.length > 1;

/**
 * `en` → `en_US`. Unknown codes resolve to the default rather than throwing —
 * a stray URL segment must not take the whole page down.
 *
 * @param short - URL-facing locale code.
 * @returns       Matching OE locale code.
 */
export function toCmsLocale(short: string | undefined): CmsLocaleCode {
  if (!short) return DEFAULT_LOCALE;
  const lower = short.toLowerCase();
  return CMS_LOCALES.find((cms) => toShortCode(cms) === lower) ?? DEFAULT_LOCALE;
}

/**
 * Type guard for a routable short code.
 *
 * @param  short - Candidate segment from the URL.
 * @returns       `true` when the storefront routes this locale.
 */
export function hasLocale(short: string | undefined): short is ShortLocaleCode {
  return typeof short === 'string' && SHORT_LOCALES.includes(short.toLowerCase());
}

/**
 * Prefix an app-relative href for the given locale, honouring the as-needed
 * scheme: the default locale is returned untouched.
 *
 * External URLs, anchors, `mailto:`/`tel:` and already-prefixed paths are
 * returned as-is so this is safe to apply blanket-wise in the `Link` wrapper.
 *
 * @param href  - App-relative path, e.g. `/cart`.
 * @param short - Target locale short code.
 * @returns       Localized path.
 */
export function localizeHref(href: string, short: ShortLocaleCode): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  if (!hasLocale(short)) return href;
  // Strip first, unconditionally: switching *to* the default has to remove an
  // existing prefix (`/fr/cart` → `/cart`), not just skip adding one.
  const stripped = stripLocale(href);
  if (short === DEFAULT_SHORT_LOCALE) return stripped;
  return stripped === '/' ? `/${short}` : `/${short}${stripped}`;
}

/**
 * Drop a leading locale segment, if present. `/fr/cart` → `/cart`,
 * `/cart` → `/cart`, `/fr` → `/`.
 *
 * @param pathname - Path that may carry a locale prefix.
 * @returns          Path without the locale segment.
 */
export function stripLocale(pathname: string): string {
  const match = /^\/([^/]+)(\/.*)?$/.exec(pathname);
  if (!match) return pathname;
  if (!hasLocale(match[1])) return pathname;
  return match[2] || '/';
}

/**
 * The locale segment of a path, or the default when there is none — which is
 * exactly the as-needed case.
 *
 * @param pathname - Current path.
 * @returns          Short locale code.
 */
export function localeFromPath(pathname: string): ShortLocaleCode {
  const first = /^\/([^/]+)/.exec(pathname)?.[1];
  return hasLocale(first) ? first.toLowerCase() : DEFAULT_SHORT_LOCALE;
}

/**
 * BCP-47 tag for the `<html lang>` attribute and hreflang, derived from the CMS
 * code: `en_US` → `en-US`. Search engines and screen readers expect the hyphen
 * form; OneEntry uses the underscore one.
 *
 * @param short - Short locale code from the URL.
 * @returns       BCP-47 language tag.
 */
export function htmlLang(short: ShortLocaleCode): string {
  return toCmsLocale(short).replace('_', '-');
}

/**
 * `alternates.languages` for Next metadata: one absolute URL per routed
 * locale plus `x-default`.
 *
 * Under the as-needed scheme the default locale's alternate is the bare URL,
 * which is also what `x-default` points at.
 *
 * @param baseUrl - Absolute site origin, no trailing slash.
 * @param [path]  - App-relative path, defaults to the site root.
 * @returns hreflang map.
 */
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

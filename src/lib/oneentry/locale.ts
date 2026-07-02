/**
 * Single source of truth for the default OneEntry locale used across all
 * fetchers. The shop is currently single-locale so this stays a constant.
 * When multi-locale routing lands (Next.js 15 `[locale]` param → `await params`),
 * every server fetcher already reads `lang: Lang = DEFAULT_LOCALE`, so the
 * migration is a mechanical swap of the default with the awaited param value.
 *
 * The value can be overridden via `NEXT_PUBLIC_DEFAULT_LOCALE` at build time
 * without touching any component.
 */
export const DEFAULT_LOCALE = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en_US') as 'en_US';

export type Locale = typeof DEFAULT_LOCALE;

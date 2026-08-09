import { type CmsLocaleCode, DEFAULT_LOCALE, toCmsLocale } from './locale';

/**
 * The OE locale code for the route currently rendering.
 *
 * Reads the `[locale]` root parameter, which any Server Component or
 * server-side utility can call without the value being threaded through props
 * — and, unlike `headers()`, without opting the tree into dynamic rendering.
 *
 * Every server fetcher calls this instead of hardcoding {@link DEFAULT_LOCALE},
 * so one CMS locale per URL falls out automatically.
 *
 * `next/root-params` is imported **dynamically**, and that is load-bearing: it
 * is a Server-Component-only module, and a static import puts it in the module
 * graph of everything that transitively reaches a fetcher — including Route
 * Handlers (`/llms.txt`) and metadata files (`sitemap.ts`), where the build
 * rejects it outright. Deferring the import keeps those graphs clean and lets
 * the call fail softly at runtime instead.
 *
 * Falls back to the default rather than throwing, because the API is genuinely
 * unavailable in Server Actions, Route Handlers and `unstable_cache`; callers
 * in those places pass the locale explicitly and the fallback never applies.
 *
 * @returns OE locale code, e.g. `en_US`.
 */
export async function currentCmsLocale(): Promise<CmsLocaleCode> {
  try {
    const { locale } = await import('next/root-params');
    return toCmsLocale(await locale());
  } catch {
    return DEFAULT_LOCALE;
  }
}

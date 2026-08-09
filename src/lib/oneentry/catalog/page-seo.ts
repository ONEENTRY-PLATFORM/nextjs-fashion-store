import type { Metadata } from 'next';

import { SITE_URL } from '@/app/data/seoData';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { buildLanguageAlternates, localizeHref, toShortCode } from '@/lib/oneentry/locale';
import type { Lang } from '@/lib/oneentry/system-text';

import { loadPageByUrl } from './pages';

/**
 * hreflang alternates for a route, derived from its canonical URL.
 *
 * Next merges page metadata over the layout's **per top-level key**, so a page
 * that declares `alternates: { canonical }` replaces the layout's `alternates`
 * wholesale and silently drops `languages`. Every route therefore has to carry
 * its own language map — which is why this is applied here rather than left to
 * the root layout.
 *
 * @param canonical - The route's canonical URL.
 * @returns hreflang map, or `undefined`.
 */
function languagesFor(canonical: NonNullable<Metadata['alternates']>['canonical']): Record<string, string> | undefined {
  if (!canonical) return undefined;
  // `canonical` may be a bare string/URL or an `AlternateLinkDescriptor`
  // (`{ url, title }`) — Next accepts both, so unwrap before parsing.
  const raw = typeof canonical === 'object' && 'url' in canonical ? canonical.url : canonical;
  if (!raw) return undefined;
  const href = typeof raw === 'string' ? raw : raw.toString();
  const path = href.startsWith(SITE_URL) ? href.slice(SITE_URL.length) || '/' : href;
  if (!path.startsWith('/')) return undefined;
  return buildLanguageAlternates(SITE_URL, path);
}

/**
 * Overlay the SEO an editor typed on the OneEntry page onto the route's local
 * metadata.
 *
 * Every storefront route carries a fallback `Metadata` object in
 * `src/app/data/seoData.ts`; this helper lets the admin panel win per field.
 * A blank attribute in OE is treated as "not set", so a half-filled page keeps
 * the coded copy for the rest — the same rule `[...slug]/page.tsx` already used
 * for info pages, lifted here so every route shares one implementation.
 *
 * `openGraph` / `twitter` inherit the overridden title and description when the
 * fallback declared them, otherwise a CMS edit would fix the `<title>` while
 * social cards kept advertising the old wording.
 *
 * @param pageUrl OE page url (`cart`, `home`, `delivery_method`, …) — NOT the
 *                storefront route.
 * @param fallback The route's local metadata.
 */
export async function withCmsSeo(pageUrl: string, fallback: Metadata, langArg?: Lang): Promise<Metadata> {
  const lang = langArg ?? (await currentCmsLocale());
  const short = toShortCode(lang);
  const page = await loadPageByUrl(pageUrl, lang);

  /**
   * Move a canonical URL onto the locale being rendered.
   *
   * Both sources of a canonical are locale-blind: the coded fallbacks in
   * `seoData.ts` are written unprefixed, and the OE `canonical` attribute is one
   * value shared by every translation of the page. Left alone, `/de/cart` would
   * name `/cart` as its canonical — which asks Google to drop the German page
   * from the index entirely. External URLs are left untouched.
   */
  const localizeCanonical = (raw: string): string => {
    const path = raw.startsWith(SITE_URL) ? raw.slice(SITE_URL.length) || '/' : raw;
    if (!path.startsWith('/')) return raw;
    const localized = localizeHref(path, short);
    return `${SITE_URL}${localized === '/' ? '' : localized}`;
  };

  /**
   * Attach hreflang to whatever canonical ends up winning, and pin both the
   * canonical and `og:url` to the current locale.
   */
  const withLanguages = (meta: Metadata, canonical?: string): Metadata => {
    const target = canonical ?? meta.alternates?.canonical;
    const languages = languagesFor(target);
    const raw = typeof target === 'string' ? target : undefined;
    const localized = raw ? localizeCanonical(raw) : undefined;
    return {
      ...meta,
      // The root layout also sets `og:locale`, but Next replaces `openGraph`
      // wholesale when a page declares its own — so a page-level object has to
      // carry the locale itself or the tag disappears from every route.
      ...(meta.openGraph
        ? { openGraph: { ...meta.openGraph, locale: lang, ...(localized ? { url: localized } : {}) } }
        : {}),
      alternates: {
        ...meta.alternates,
        ...(localized ? { canonical: localized } : {}),
        ...(languages ? { languages } : {}),
      },
    };
  };

  if (!page) return withLanguages(fallback);

  const attr = (marker: string): string => {
    const v = (page.attributeValues as Record<string, { value?: unknown }> | undefined)?.[marker]?.value;
    return typeof v === 'string' ? v.trim() : '';
  };

  const title = attr('meta_title');
  const description = attr('meta_description');
  const keywords = attr('meta_keywords');
  const canonical = attr('canonical');
  if (!title && !description && !keywords && !canonical) return withLanguages(fallback);

  const openGraph = fallback.openGraph
    ? {
        ...fallback.openGraph,
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(canonical ? { url: canonical } : {}),
      }
    : fallback.openGraph;

  const twitter = fallback.twitter
    ? {
        ...fallback.twitter,
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
      }
    : fallback.twitter;

  const merged: Metadata = {
    ...fallback,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(keywords ? { keywords } : {}),
    ...(canonical ? { alternates: { ...fallback.alternates, canonical } } : {}),
    ...(openGraph ? { openGraph } : {}),
    ...(twitter ? { twitter } : {}),
  };
  return withLanguages(merged, canonical || undefined);
}

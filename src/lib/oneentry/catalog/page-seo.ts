import type { Metadata } from 'next';
import { loadPageByUrl } from './pages';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';

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
export async function withCmsSeo(
  pageUrl: string,
  fallback: Metadata,
  lang: Lang = DEFAULT_LOCALE,
): Promise<Metadata> {
  const page = await loadPageByUrl(pageUrl, lang);
  if (!page) return fallback;

  const attr = (marker: string): string => {
    const v = (page.attributeValues as Record<string, { value?: unknown }> | undefined)?.[marker]?.value;
    return typeof v === 'string' ? v.trim() : '';
  };

  const title = attr('meta_title');
  const description = attr('meta_description');
  const keywords = attr('meta_keywords');
  const canonical = attr('canonical');
  if (!title && !description && !keywords && !canonical) return fallback;

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

  return {
    ...fallback,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(keywords ? { keywords } : {}),
    ...(canonical ? { alternates: { ...fallback.alternates, canonical } } : {}),
    ...(openGraph ? { openGraph } : {}),
    ...(twitter ? { twitter } : {}),
  };
}

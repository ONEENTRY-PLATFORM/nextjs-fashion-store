import type { Metadata } from 'next';

import { SITE_URL } from '@/app/data/seoData';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { buildLanguageAlternates, localizeHref, toShortCode } from '@/lib/oneentry/locale';
import type { Lang } from '@/lib/oneentry/system-text';

import { loadPageByUrl } from './pages';

/** hreflang alternates for a route, derived from its canonical URL. Reduce a canonical to a site-relative path. */
function toSitePath(href: string): string | null {
  const raw = href.trim();
  if (!raw) return null;
  if (raw.startsWith(SITE_URL)) return raw.slice(SITE_URL.length) || '/';
  if (raw.startsWith('/')) return raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const { pathname, search } = new URL(raw);
      return `${pathname}${search}` || '/';
    } catch {
      return null;
    }
  }
  return null;
}

function languagesFor(canonical: NonNullable<Metadata['alternates']>['canonical']): Record<string, string> | undefined {
  if (!canonical) return undefined;
  // `canonical` may be a bare string/URL or an `AlternateLinkDescriptor` (`{ url, title }`) — Next accepts both, so unwrap before parsing.
  const raw = typeof canonical === 'object' && 'url' in canonical ? canonical.url : canonical;
  if (!raw) return undefined;
  const href = typeof raw === 'string' ? raw : raw.toString();
  const path = toSitePath(href);
  if (!path) return undefined;
  return buildLanguageAlternates(SITE_URL, path);
}

/** Overlay the SEO an editor typed on the OneEntry page onto the route's local metadata. */
export async function withCmsSeo(pageUrl: string, fallback: Metadata, langArg?: Lang): Promise<Metadata> {
  const lang = langArg ?? (await currentCmsLocale());
  const short = toShortCode(lang);
  const page = await loadPageByUrl(pageUrl, lang);

  /** Move a canonical URL onto the locale being rendered. */
  const localizeCanonical = (raw: string): string => {
    const path = toSitePath(raw);
    if (!path) return raw;
    const localized = localizeHref(path, short);
    return `${SITE_URL}${localized === '/' ? '' : localized}`;
  };

  /** Attach hreflang to whatever canonical ends up winning, and pin both the canonical and `og:url` to the current locale. */
  const withLanguages = (meta: Metadata, canonical?: string): Metadata => {
    const target = canonical ?? meta.alternates?.canonical;
    const languages = languagesFor(target);
    const raw = typeof target === 'string' ? target : undefined;
    const localized = raw ? localizeCanonical(raw) : undefined;
    return {
      ...meta,
      // The root layout also sets `og:locale`, but Next replaces `openGraph` wholesale when a page declares its own.
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

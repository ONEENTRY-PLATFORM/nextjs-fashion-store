/**
 * pageRegistry — the single source of truth for dynamic pages.
 *
 * Key   = URL path (without leading slash), e.g. 'women/clothing', 'about-us'.
 * Data is currently sourced from datasets; once the API is ready, replace
 * `PAGE_REGISTRY` with an async fetch from OneEntry.
 *
 * Used in:
 *   app/[...slug]/page.tsx  — catch-all route
 *   app/sitemap.ts          — sitemap generation
 */

import { type Metadata } from 'next';
import { SEO, SITE_URL } from './seoData';
import { INFO_PAGE_META, INFO_SLUGS } from './infoPages';

/* ─── Types ─── */

export interface CatalogPageEntry {
  type: 'catalog';
  /** Catalog component key, e.g. 'women-clothing' */
  catalogKey: string;
  /** Key in the SEO object (seoData.ts) */
  seoKey: keyof typeof SEO;
  /** Product id prefix for JSON-LD ItemList, e.g. 'wc-' */
  productIdPrefix: string;
  /** Name for schema.org ItemList */
  schemaName: string;
  /** Breadcrumbs [{name, href?}] */
  breadcrumbs: Array<{ name: string; href?: string }>;
}

interface InfoPageEntry {
  type: 'info';
  /** Key in INFO_PAGE_META; '__hub' = page listing all sections */
  slug: string;
}

type PageEntry = CatalogPageEntry | InfoPageEntry;

/* ─── Page registry ─── */

export const PAGE_REGISTRY: Record<string, PageEntry> = {
  /* ──────────── CATALOG — Women ──────────── */
  'women/clothing': {
    type: 'catalog',
    catalogKey: 'women-clothing',
    seoKey: 'womenClothing',
    productIdPrefix: 'wc-',
    schemaName: "Women's Clothing",
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: "Women's", href: '/women/clothing' },
      { name: 'Clothing' },
    ],
  },
  'women/shoes': {
    type: 'catalog',
    catalogKey: 'women-shoes',
    seoKey: 'womenShoes',
    productIdPrefix: 'ws-',
    schemaName: "Women's Shoes",
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: "Women's", href: '/women/clothing' },
      { name: 'Shoes' },
    ],
  },
  'women/bags': {
    type: 'catalog',
    catalogKey: 'women-bags',
    seoKey: 'womenBags',
    productIdPrefix: 'wb-',
    schemaName: "Women's Bags",
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: "Women's", href: '/women/clothing' },
      { name: 'Bags' },
    ],
  },
  'women/accessories': {
    type: 'catalog',
    catalogKey: 'women-accessories',
    seoKey: 'womenAccessories',
    productIdPrefix: 'wa-',
    schemaName: "Women's Accessories",
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: "Women's", href: '/women/clothing' },
      { name: 'Accessories' },
    ],
  },

  /* ──────────── CATALOG — Men ──────────── */
  'men/clothing': {
    type: 'catalog',
    catalogKey: 'men-clothing',
    seoKey: 'menClothing',
    productIdPrefix: 'mc-',
    schemaName: "Men's Clothing",
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: "Men's", href: '/men/clothing' },
      { name: 'Clothing' },
    ],
  },
  'men/shoes': {
    type: 'catalog',
    catalogKey: 'men-shoes',
    seoKey: 'menShoes',
    productIdPrefix: 'ms-',
    schemaName: "Men's Shoes",
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: "Men's", href: '/men/clothing' },
      { name: 'Shoes' },
    ],
  },
  'men/bags': {
    type: 'catalog',
    catalogKey: 'men-bags',
    seoKey: 'menBags',
    productIdPrefix: 'mb-',
    schemaName: "Men's Bags",
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: "Men's", href: '/men/clothing' },
      { name: 'Bags' },
    ],
  },
  'men/accessories': {
    type: 'catalog',
    catalogKey: 'men-accessories',
    seoKey: 'menAccessories',
    productIdPrefix: 'ma-',
    schemaName: "Men's Accessories",
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: "Men's", href: '/men/clothing' },
      { name: 'Accessories' },
    ],
  },

  /* ──────────── INFO — Content pages ──────────── */
  // Hub listing all info sections
  info: { type: 'info', slug: '__hub' },

  // Each info page is reachable under both `/{slug}` and `/info/{slug}` —
  // the footer / breadcrumbs link to the prefixed form, while the OE menu
  // returns bare slugs. Registering both shapes keeps every entry point in
  // the storefront resolving to the same InfoPage instead of a 404.
  ...Object.fromEntries(
    INFO_SLUGS.flatMap((slug) => [
      [slug,            { type: 'info' as const, slug }],
      [`info/${slug}`,  { type: 'info' as const, slug }],
    ]),
  ),
};

/* ─── Helpers ─── */

/** Generate metadata for the catch-all route */
export function buildPageMetadata(entry: PageEntry): Metadata {
  if (entry.type === 'catalog') {
    return (SEO[entry.seoKey] ?? {}) as Metadata;
  }
  if (entry.slug === '__hub') {
    return {
      title: 'Content Hub | ONEENTRY Fashion',
      description:
        'Discover everything about ONEENTRY Fashion — delivery, returns, sizing, care, careers, sustainability and more.',
      alternates: { canonical: `${SITE_URL}/info` },
    };
  }
  const meta = INFO_PAGE_META[entry.slug];
  if (!meta) return {};
  return {
    title: `${meta.title} | ONEENTRY Fashion`,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: `${SITE_URL}/${entry.slug}` },
  };
}

/** JSON-LD breadcrumb schema */
export function buildBreadcrumbSchema(breadcrumbs: Array<{ name: string; href?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      ...(crumb.href ? { item: `${SITE_URL}${crumb.href}` } : {}),
    })),
  };
}

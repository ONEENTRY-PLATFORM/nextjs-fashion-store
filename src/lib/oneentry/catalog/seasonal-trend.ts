import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApiSafe, isError } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { logCaught } from '@/lib/oneentry/log';

import type { CatalogFilters } from './filters';

/** `CatalogFilters` keys that hold multi-value lists. */
type CatalogListField =
  | 'colors'
  | 'sizes'
  | 'brands'
  | 'styles'
  | 'materials'
  | 'seasons'
  | 'fits'
  | 'liningMaterials'
  | 'brandCountries'
  | 'labels'
  | 'productDetails'
  | 'careInstructions'
  | 'insulations';

/** Map an OE attribute marker (or its human-friendly synonym) to the `CatalogFilters` key that drives storefront filtering. */
const ATTR_ALIAS_TO_FILTER: Record<string, CatalogListField> = {
  color: 'colors',
  color_9: 'colors',
  colors: 'colors',
  size: 'sizes',
  size_10: 'sizes',
  sizes: 'sizes',
  brand: 'brands',
  brand_7: 'brands',
  brands: 'brands',
  style: 'styles',
  style_3: 'styles',
  styles: 'styles',
  material: 'materials',
  material_15: 'materials',
  materials: 'materials',
  season: 'seasons',
  season_19: 'seasons',
  seasons: 'seasons',
  fit: 'fits',
  fitrise_4: 'fits',
  fits: 'fits',
  lining: 'liningMaterials',
  lining_16: 'liningMaterials',
  liningmaterial: 'liningMaterials',
  country: 'brandCountries',
  country_20: 'brandCountries',
  brandcountry: 'brandCountries',
  label: 'labels',
  lable_23: 'labels',
  labels: 'labels',
  details: 'productDetails',
  details_5: 'productDetails',
  productdetails: 'productDetails',
  careinstructions: 'careInstructions',
  careinstructions_18: 'careInstructions',
  insulation: 'insulations',
  insulation_17: 'insulations',
  insulations: 'insulations',
};

/** Read an attribute value from OE's normalized `attributeValues` map. */
function readAttr(attrs: Record<string, unknown>, markers: string[]): string {
  for (const m of markers) {
    const raw = attrs[m];
    if (raw == null) continue;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object') {
      const v = (raw as { value?: unknown }).value;
      if (typeof v === 'string') return v;
      // OE `list` attribute values arrive as `[{ value }]` — first entry wins.
      if (Array.isArray(v) && v.length > 0) {
        const first = v[0] as { value?: unknown; title?: unknown };
        if (typeof first?.value === 'string') return first.value;
        if (typeof first?.title === 'string') return first.title;
      }
    }
  }
  return '';
}

export type SeasonalTrend =
  { kind: 'category'; value: string } | { kind: 'attribute'; field: CatalogListField; value: string };

/** Resolve a SEASONAL TRENDS page into the filter it should apply to the catalog grid. */
export async function resolveSeasonalTrend(pageUrl: string, langArg?: string): Promise<SeasonalTrend | null> {
  const api = getApiSafe();
  if (!api) return null;
  const lang = langArg ?? (await currentCmsLocale());
  // Fetch OE directly instead of going through the request-cached `loadPageByUrl`.
  let result: unknown;
  try {
    result = await api.Pages.getPageByUrl(pageUrl, lang);
  } catch (err) {
    logCaught(`seasonal-trend.resolveSeasonalTrend(${pageUrl})`, err);
    return null;
  }
  if (!result || isError(result)) return null;
  const raw = result as { attributeValues?: Record<string, unknown> | Record<string, Record<string, unknown>> };
  const rawAttrs = (raw.attributeValues ?? {}) as Record<string, unknown>;
  // `_normalizeData` in the SDK usually unwraps the per-locale wrapper, but some tenants still return `{ en_US: { attr: {...} } }`. Support both.
  const localeSlice = rawAttrs[lang] ?? rawAttrs[DEFAULT_LOCALE];
  const attrs: Record<string, unknown> =
    localeSlice && typeof localeSlice === 'object' && !Array.isArray(localeSlice)
      ? (localeSlice as Record<string, unknown>)
      : rawAttrs;
  const rawType = readAttr(attrs, ['st_type-of-trends', 'st_type_of_trends']).trim();
  const value = readAttr(attrs, ['st_trends']).trim();
  if (!rawType || !value) return null;
  const type = rawType.toLowerCase();
  if (type === 'category') return { kind: 'category', value };
  const field = ATTR_ALIAS_TO_FILTER[type] ?? ATTR_ALIAS_TO_FILTER[type.replace(/_\d+$/, '')];
  if (!field) return null;
  return { kind: 'attribute', field, value };
}

/** Apply a resolved SEASONAL TRENDS descriptor to a `CatalogFilters` object. */
export function applySeasonalTrend(filters: CatalogFilters, trend: SeasonalTrend): CatalogFilters {
  if (trend.kind === 'category') {
    return { ...filters, category: trend.value };
  }
  const existing = (filters[trend.field] as string[] | undefined) ?? [];
  return {
    ...filters,
    // Drop the pageUrl-based category filter — the shopper is on a SEASONAL TRENDS page whose subject is an attribute, not a taxonomy leaf.
    category: undefined,
    [trend.field]: existing.includes(trend.value) ? existing : [...existing, trend.value],
  };
}

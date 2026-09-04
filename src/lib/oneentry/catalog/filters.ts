/** Catalog filter parsing / building. */

export interface CatalogFilters {
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  colors?: string[];
  sizes?: string[];
  brands?: string[];
  styles?: string[];
  materials?: string[];
  seasons?: string[];
  fits?: string[];
  liningMaterials?: string[];
  brandCountries?: string[];
  labels?: string[];
  productDetails?: string[];
  careInstructions?: string[];
  insulations?: string[];
  /** Shoe filters shipped by OE's `women_shoes` / `men_shoes` filter defs. */
  soleMaterials?: string[];
  insoleMaterials?: string[];
  /** Discount toggle — surfaces the OE filter group of the same name. */
  discountOnly?: boolean;
  sort?: string;
  page?: number;
  chip?: string;
  /** OE category `pageUrl` — a specific leaf inside the current section (e.g. `dresses_skirts`). */
  category?: string;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** URL param key → CatalogFilters list field. */
const LIST_KEYS: Record<string, keyof CatalogFilters> = {
  color: 'colors',
  size: 'sizes',
  brand: 'brands',
  style: 'styles',
  material: 'materials',
  season: 'seasons',
  fit: 'fits',
  liningMaterial: 'liningMaterials',
  brandCountry: 'brandCountries',
  label: 'labels',
  details: 'productDetails',
  careInstructions: 'careInstructions',
  insulation: 'insulations',
  soleMaterial: 'soleMaterials',
  insoleMaterial: 'insoleMaterials',
};

/** Inverse of LIST_KEYS — used by serializeCatalogSearchParams to flip a CatalogFilters object back into URL params. */
const LIST_FIELD_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(LIST_KEYS).map(([urlKey, field]) => [field as string, urlKey]),
);

/*
  URL keys that make a catalog listing a filtered variant of itself rather than a page in its own
  right. Used to keep those variants out of the search index: the fifteen list facets combine into an
  unbounded number of URLs carrying no unique content, and this route renders dynamically, so each one
  is a fresh server render.

  Two of the keys `parseCatalogSearchParams` reads are deliberately absent:

  - `chip` — a mega-menu leaf deep-link (`/women/clothing/category/outerwear`) *redirects* to
    `/women/clothing?chip=Outerwear`, so this query URL is the leaf's actual address. De-indexing it
    would drop the whole leaf category out of the index.
  - `category` — feeds the seasonal-trend resolution and may likewise be a navigation destination
    rather than a filter. Left indexable as the conservative call: keeping a page indexable is the
    reversible direction, dropping one is not.
*/
export const FACET_URL_KEYS: readonly string[] = [
  ...Object.keys(LIST_KEYS),
  'minPrice',
  'maxPrice',
  'inStock',
  'sort',
  'page',
];

/**
 * Whether the inbound `searchParams` describe a filtered/sorted/paginated catalog view rather than the
 * bare listing. `page=1` counts as the bare listing; so do empty values, which the filter UI leaves
 * behind when a control is cleared.
 */
export function isFilteredCatalogView(sp: RawSearchParams): boolean {
  if (!sp) return false;
  return FACET_URL_KEYS.some((key) => {
    const value = sp[key];
    if (value == null || value === '') return false;
    if (key === 'page') return Number(firstString(value)) > 1;
    return Array.isArray(value) ? value.length > 0 : true;
  });
}

const firstString = (v: string | string[] | undefined): string | undefined => {
  if (Array.isArray(v)) return v[0];
  return v;
};

const splitCsv = (v: string | string[] | undefined): string[] | undefined => {
  if (!v) return undefined;
  const flat = Array.isArray(v) ? v.join(',') : v;
  const parts = flat
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts : undefined;
};

const toFiniteNumber = (v: string | undefined): number | undefined => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Parse Next.js `searchParams` into a typed `CatalogFilters` object. */
export function parseCatalogSearchParams(sp: RawSearchParams): CatalogFilters {
  const out: CatalogFilters = {};
  const minPrice = toFiniteNumber(firstString(sp.minPrice));
  const maxPrice = toFiniteNumber(firstString(sp.maxPrice));
  if (minPrice !== undefined) out.minPrice = minPrice;
  if (maxPrice !== undefined) out.maxPrice = maxPrice;

  if (firstString(sp.inStock) === 'true') out.inStockOnly = true;

  for (const [urlKey, field] of Object.entries(LIST_KEYS)) {
    const vals = splitCsv(sp[urlKey]);
    if (vals) (out as Record<string, unknown>)[field as string] = vals;
  }

  const sort = firstString(sp.sort);
  if (sort) out.sort = sort;

  const page = toFiniteNumber(firstString(sp.page));
  if (page !== undefined && page > 0) out.page = Math.floor(page);

  const chip = firstString(sp.chip);
  if (chip) out.chip = chip;

  const category = firstString(sp.category);
  if (category) out.category = category;

  return out;
}

/** Serialize a `CatalogFilters` back into a URL query string suitable for `router.replace`. Empty / undefined fields are stripped so they don't bloat the URL with `?color=&size=&minPrice=`. */
export function serializeCatalogSearchParams(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  if (filters.inStockOnly) params.set('inStock', 'true');

  for (const [field, urlKey] of Object.entries(LIST_FIELD_TO_KEY)) {
    const vals = (filters as Record<string, unknown>)[field] as string[] | undefined;
    if (vals && vals.length > 0) params.set(urlKey, vals.join(','));
  }

  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page !== undefined && filters.page > 1) params.set('page', String(filters.page));
  if (filters.chip) params.set('chip', filters.chip);
  if (filters.category) params.set('category', filters.category);

  return params.toString();
}

/* Removed: `OEFilterRecord`, `STATUS_IN_STOCK`, `LIST_FIELD_TO_OE_MARKER`,
 * `PRICE_MARKER`, `buildOEFilterBody`.
 *
 * These were scaffolding for a server-side filter path against OE
 * `Products.getProducts(filter, ...)` that never landed — the storefront
 * filters `loadFullCatalog` locally in `products.ts` via
 * `matchesCatalogFilters`. Nothing imported the exports, and the OE marker
 * table risked drifting from the actually-used values. Keeping the file
 * lean makes it clear which path is live. Restore from git history if we
 * ever revive the server-side filter route.
 */

/** Mapping from the storefront `CatalogTemplate` filter group `key` (used by UI components when the user toggles a checkbox) onto the corresponding URL parameter name. */
const FE_GROUP_TO_FILTER_FIELD: Record<string, keyof CatalogFilters> = {
  color: 'colors',
  size: 'sizes',
  brand: 'brands',
  style: 'styles',
  material: 'materials',
  season: 'seasons',
  fit: 'fits',
  liningMaterial: 'liningMaterials',
  brandCountry: 'brandCountries',
  label: 'labels',
  productDetails: 'productDetails',
  careInstructions: 'careInstructions',
  insulation: 'insulations',
  soleMaterial: 'soleMaterials',
  insoleMaterial: 'insoleMaterials',
};

/** Returns true if the filter group key has a backing OE marker we know about. */
export function isFilterGroupSupported(groupKey: string): boolean {
  return groupKey in FE_GROUP_TO_FILTER_FIELD || groupKey === 'price' || groupKey === 'storeAvailability';
}

/** Toggle a single filter option (e.g. checkbox click on the Color filter) inside a `CatalogFilters` object. */
export function toggleFilterOption(filters: CatalogFilters, groupKey: string, optionValue: string): CatalogFilters {
  const field = FE_GROUP_TO_FILTER_FIELD[groupKey];
  if (!field) return filters;
  const current = ((filters as Record<string, unknown>)[field] as string[] | undefined) ?? [];
  const next = current.includes(optionValue) ? current.filter((v) => v !== optionValue) : [...current, optionValue];
  const out: CatalogFilters = { ...filters };
  if (next.length > 0) (out as Record<string, unknown>)[field] = next;
  else delete (out as Record<string, unknown>)[field];
  // Resetting page to 1 — selection change usually invalidates pagination.
  delete out.page;
  return out;
}

/** Selected values for a filter group, used by the UI to render check marks. */
export function getSelectedOptionsForGroup(filters: CatalogFilters, groupKey: string): string[] {
  const field = FE_GROUP_TO_FILTER_FIELD[groupKey];
  if (!field) return [];
  return ((filters as Record<string, unknown>)[field] as string[] | undefined) ?? [];
}

/** Total number of selected filter values across all supported groups. */
export function countActiveFilters(filters: CatalogFilters): number {
  let n = 0;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) n += 1;
  if (filters.inStockOnly) n += 1;
  for (const field of Object.values(FE_GROUP_TO_FILTER_FIELD)) {
    const vals = (filters as Record<string, unknown>)[field] as string[] | undefined;
    if (vals && vals.length > 0) n += vals.length;
  }
  return n;
}

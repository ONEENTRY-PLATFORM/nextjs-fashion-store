/**
 * Catalog filter parsing / building.
 *
 * Lives between the URL (source of truth for filter state) and the
 * OneEntry `Products.getProducts(filter, ...)` API. The catalog page
 * component reads `searchParams`, runs it through `parseCatalogSearchParams`,
 * then passes the result to `buildOEFilterBody` to query OE.
 *
 * Real attribute markers (snapshot from /inspect-api products on the
 * `e-commerce.oneentry.cloud` tenant):
 *   - price          (float)
 *   - colors         (list, hex values)
 *   - sizes          (list)
 *   - brand          (string-ish; list of {value})
 *   - brand_country  (list)
 *   - material       (list)
 *   - style          (list)
 *   - season         (string-ish)
 *   - fit            (list)
 *   - lining_material(list)
 *   - label          (list)
 *
 * UI groups present on the storefront but absent in OE — `productDetails`,
 * `careInstructions`, `insulation` — get silently dropped here.
 */

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
  sort?: string;
  page?: number;
  chip?: string;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** URL param key → CatalogFilters list field. Multi-value entries are
 *  comma-separated in the URL (e.g. `?color=Black,White`). */
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
};

/** Inverse of LIST_KEYS — used by serializeCatalogSearchParams to flip a
 *  CatalogFilters object back into URL params. */
const LIST_FIELD_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(LIST_KEYS).map(([urlKey, field]) => [field as string, urlKey]),
);

const firstString = (v: string | string[] | undefined): string | undefined => {
  if (Array.isArray(v)) return v[0];
  return v;
};

const splitCsv = (v: string | string[] | undefined): string[] | undefined => {
  if (!v) return undefined;
  const flat = Array.isArray(v) ? v.join(',') : v;
  const parts = flat.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  return parts.length > 0 ? parts : undefined;
};

const toFiniteNumber = (v: string | undefined): number | undefined => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Parse Next.js `searchParams` into a typed `CatalogFilters` object.
 *  Skips unknown keys silently so non-filter query params (`utm_source`, etc.)
 *  don't interfere. */
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

  return out;
}

/** Serialize a `CatalogFilters` back into a URL query string suitable for
 *  `router.replace`. Empty / undefined fields are stripped so they don't bloat
 *  the URL with `?color=&size=&minPrice=`. */
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

  return params.toString();
}

/** Single record for the OE `Products.getProducts(filter, ...)` body. */
export interface OEFilterRecord {
  attributeMarker: string;
  conditionMarker: 'mth' | 'lth' | 'in' | 'eq' | 'nin' | 'lke';
  conditionValue: string | number;
  statusMarker?: string;
}

/**
 * Build the filter body for OneEntry `Products.getProducts(...)`.
 *
 * Notes on quirks:
 *  - OE applies `statusMarker` from any record to the whole query, but it
 *    must appear in a filter record — the SDK ignores `statusMarker` on the
 *    query object itself (confirmed by the create-product-list skill).
 *  - When the only condition is "in stock", the body still needs at least one
 *    filter record. We add a catch-all `price mth -1` carrying the status.
 *  - Price boundaries use ±0.01 so the user-typed boundary is inclusive
 *    (`mth = more than`, `lth = less than` — both strict).
 */
const STATUS_IN_STOCK = 'in_stock';

// OE markers in this tenant carry a numeric suffix
// (`color_9`, `size_10`, etc.) — confirmed by the `/clothing` filter spec
// and a direct product attribute dump. The filter API requires these exact
// markers; the suffixless equivalents (`colors`, `sizes`) silently match
// zero rows.
const LIST_FIELD_TO_OE_MARKER: Partial<Record<keyof CatalogFilters, string>> = {
  colors: 'color_9',
  sizes: 'size_10',
  brands: 'brand_7',
  styles: 'style_3',
  materials: 'material_15',
  seasons: 'season_19',
  fits: 'fitrise_4',
  liningMaterials: 'lining_16',
  brandCountries: 'country_20',
  labels: 'lable_23',
  productDetails: 'details_5',
  careInstructions: 'careinstructions_18',
  insulations: 'insulation_17',
};

const PRICE_MARKER = 'price_14';

export function buildOEFilterBody(filters: CatalogFilters): OEFilterRecord[] {
  const body: OEFilterRecord[] = [];
  const status = filters.inStockOnly ? STATUS_IN_STOCK : undefined;
  const withStatus = <T extends OEFilterRecord>(rec: T): T =>
    status ? ({ ...rec, statusMarker: status } as T) : rec;

  if (filters.minPrice !== undefined) {
    body.push(withStatus({
      attributeMarker: PRICE_MARKER,
      conditionMarker: 'mth',
      conditionValue: filters.minPrice - 0.01,
    }));
  }
  if (filters.maxPrice !== undefined) {
    body.push(withStatus({
      attributeMarker: PRICE_MARKER,
      conditionMarker: 'lth',
      conditionValue: filters.maxPrice + 0.01,
    }));
  }

  for (const [field, marker] of Object.entries(LIST_FIELD_TO_OE_MARKER)) {
    const vals = (filters as Record<string, unknown>)[field] as string[] | undefined;
    if (vals && vals.length > 0) {
      body.push(withStatus({
        attributeMarker: marker as string,
        conditionMarker: 'in',
        conditionValue: vals.join(','),
      }));
    }
  }

  if (status && body.length === 0) {
    body.push({
      attributeMarker: PRICE_MARKER,
      conditionMarker: 'mth',
      conditionValue: -1,
      statusMarker: status,
    });
  }

  return body;
}

/**
 * Mapping from the storefront `CatalogTemplate` filter group `key` (used by
 * UI components when the user toggles a checkbox) onto the corresponding
 * URL parameter name. Used by the catalog page client to compute the new
 * search-string when a filter is toggled.
 *
 * Keys whose OE attribute markers don't exist (`productDetails`,
 * `careInstructions`, `insulation`, mock-only shoe attributes) get a
 * default empty mapping — `toggleFilterInSearchParams` then becomes a no-op.
 */
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
};

/** Returns true if the filter group key has a backing OE marker we know about
 *  (i.e. flipping it actually filters the products). UI uses this to grey
 *  out unsupported groups instead of letting the user toggle a no-op. */
export function isFilterGroupSupported(groupKey: string): boolean {
  return groupKey in FE_GROUP_TO_FILTER_FIELD
    || groupKey === 'price'
    || groupKey === 'storeAvailability';
}

/** Toggle a single filter option (e.g. checkbox click on the Color filter)
 *  inside a `CatalogFilters` object. Returns a new object; doesn't mutate. */
export function toggleFilterOption(
  filters: CatalogFilters,
  groupKey: string,
  optionValue: string,
): CatalogFilters {
  const field = FE_GROUP_TO_FILTER_FIELD[groupKey];
  if (!field) return filters;
  const current = ((filters as Record<string, unknown>)[field] as string[] | undefined) ?? [];
  const next = current.includes(optionValue)
    ? current.filter((v) => v !== optionValue)
    : [...current, optionValue];
  const out: CatalogFilters = { ...filters };
  if (next.length > 0) (out as Record<string, unknown>)[field] = next;
  else delete (out as Record<string, unknown>)[field];
  // Resetting page to 1 — selection change usually invalidates pagination.
  delete out.page;
  return out;
}

/** Selected values for a filter group, used by the UI to render check marks. */
export function getSelectedOptionsForGroup(
  filters: CatalogFilters,
  groupKey: string,
): string[] {
  const field = FE_GROUP_TO_FILTER_FIELD[groupKey];
  if (!field) return [];
  return ((filters as Record<string, unknown>)[field] as string[] | undefined) ?? [];
}

/** Total number of selected filter values across all supported groups —
 *  drives the "FILTERS (n)" badge in the catalog header. Counts the
 *  price range as 1 if any bound is set, inStock as 1 when active. */
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

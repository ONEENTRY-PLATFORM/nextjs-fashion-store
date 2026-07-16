import { cache } from 'react';
import { getApi, isError, isOneEntryEnabled } from '../index';
import { DEFAULT_LOCALE } from '../locale';
import { withTiming } from '../profiling';
import { logCaught } from '../log';

type RawLocalize = { en_US?: { title?: string }; title?: string };
type RawItem = {
  type?: string;
  marker?: string | null;
  url?: string | null;
  value?: string | null;
  position?: number;
  localizeInfos?: RawLocalize;
};
type RawChipsFilter = { items?: RawItem[] };

/**
 * One quick-filter chip loaded from OE. Two shapes:
 *  - `type: 'page'`      → chip narrows the catalog to the OE category `url`
 *    (`outerwear`, `boots`, `belts`, …). Applied server-side by setting
 *    `filters.category`.
 *  - `type: 'attribute'` → chip carries an attribute `marker`+`value` pair
 *    (`material_14` / `"Leather"`, `details_4` / `"Closure/Hardware: Zip"`).
 *    Applied server-side by pushing the value into the matching
 *    `CatalogFilters` list field (materials / productDetails / …).
 */
export interface FilterChip {
  label: string;
  type: 'page' | 'attribute';
  /** For `type: 'page'` — the OE category `pageUrl`. */
  url?: string;
  /** For `type: 'attribute'` — the raw OE attribute marker (`material_14`). */
  marker?: string;
  /** For `type: 'attribute'` — the value to match. */
  value?: string;
}

function pickTitle(info: RawLocalize | undefined, fallback = ''): string {
  if (!info) return fallback;
  const nested = (info as { en_US?: { title?: string } }).en_US;
  if (nested && typeof nested.title === 'string' && nested.title.trim()) {
    return nested.title.trim();
  }
  const flat = (info as { title?: string }).title;
  if (typeof flat === 'string' && flat.trim()) return flat.trim();
  return fallback;
}

/**
 * Fetch the OE `filter_chips_<catalog>` filter and adapt to a flat list of
 * chip descriptors ordered by `position`. Marker mirrors `catalogKey` with
 * hyphens swapped for underscores (`men-bags` → `filter_chips_men_bags`).
 * Returns `null` when OE is disabled, unreachable, or the marker isn't found.
 *
 * Chip items in OE come in two flavours:
 *  - `type: 'page'`      — chip narrows the grid to that category `url`.
 *  - `type: 'attribute'` — chip applies the `marker`+`value` attribute filter.
 */
export const loadFilterChips = cache(
  withTiming('loadFilterChips', async (
    catalogKey: string,
    lang: string = DEFAULT_LOCALE,
  ): Promise<FilterChip[] | null> => {
    if (!isOneEntryEnabled) return null;
    const marker = `filter_chips_${catalogKey.replace(/-/g, '_')}`;
    try {
      const result = await getApi().Filters.getFilterByMarker(marker, lang);
      if (isError(result)) return null;
      const raw = result as unknown as RawChipsFilter;
      const items = [...(raw.items ?? [])].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      );
      const chips: FilterChip[] = [];
      for (const item of items) {
        const label = pickTitle(item.localizeInfos, item.value ?? '');
        if (!label) continue;
        const rawType = item.type ?? '';
        if (rawType === 'page' && item.url) {
          chips.push({ label, type: 'page', url: item.url });
        } else if (rawType === 'attribute' && item.marker && item.value) {
          chips.push({
            label,
            type: 'attribute',
            marker: item.marker,
            value: item.value,
          });
        }
      }
      return chips;
    } catch (err) {
      logCaught(`filter-chips.loadFilterChips(${marker}, ${lang})`, err);
      return null;
    }
  }),
);

/**
 * Given the shopper-clicked chip label and the loaded descriptor list,
 * return a partial `CatalogFilters` patch that applies the chip's filter
 * effect. For `type: 'page'` chips, sets `category`. For `type: 'attribute'`
 * chips, appends the value into the list field matching the attribute
 * marker prefix (e.g. `material_*` → `materials`).
 *
 * Returns `null` when no matching chip descriptor is found — the caller
 * should keep the filters unchanged in that case (the chip label is still
 * echoed back to the UI so the shopper sees the pressed state).
 */
export function chipToFilterPatch(
  chipLabel: string,
  chips: FilterChip[] | null | undefined,
): { category?: string; attributeField?: string; attributeValue?: string } | null {
  if (!chips) return null;
  const found = chips.find((c) => c.label === chipLabel);
  if (!found) return null;
  if (found.type === 'page' && found.url) {
    return { category: found.url };
  }
  if (found.type === 'attribute' && found.marker && found.value) {
    const field = attributeMarkerToFilterField(found.marker);
    if (field) {
      return { attributeField: field, attributeValue: found.value };
    }
  }
  return null;
}

/**
 * Map an OE attribute marker (e.g. `material_14`, `details_4`) onto the
 * `CatalogFilters` list-field key that `matchesCatalogFilters` reads. Both
 * bag-specific (`material_14` / `details_4`) and clothing-specific
 * (`material_15` / `details_5`) markers collapse onto the same storefront
 * field because the product normalizer stores them under a single canonical
 * name (`p.materials`, `p.productDetails`).
 */
function attributeMarkerToFilterField(marker: string): string | null {
  const root = marker.replace(/_\d+$/, '');
  const map: Record<string, string> = {
    material: 'materials',
    details: 'productDetails',
    color: 'colors',
    size: 'sizes',
    brand: 'brands',
    style: 'styles',
    season: 'seasons',
    fit: 'fits',
    fitrise: 'fits',
    lining_material: 'liningMaterials',
    lining: 'liningMaterials',
    country: 'brandCountries',
    brand_country: 'brandCountries',
    label: 'labels',
    lable: 'labels',
    careinstructions: 'careInstructions',
    care: 'careInstructions',
    insulation: 'insulations',
  };
  return map[root] ?? null;
}

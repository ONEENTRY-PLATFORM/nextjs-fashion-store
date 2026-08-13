import { cache } from 'react';

import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApi, isError, isOneEntryEnabled } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { logCaught } from '@/lib/oneentry/log';
import { withTiming } from '@/lib/oneentry/profiling';

type RawLocalize = { title?: string } & Record<string, { title?: string } | undefined>;
type RawItem = {
  type?: string;
  marker?: string | null;
  url?: string | null;
  value?: string | null;
  position?: number;
  localizeInfos?: RawLocalize;
};
type RawChipsFilter = { items?: RawItem[] };

/** One quick-filter chip loaded from OE. */
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

function pickTitle(info: RawLocalize | undefined, lang: string, fallback = ''): string {
  if (!info) return fallback;
  // Per-locale first, in the language actually asked for.
  for (const key of [lang, DEFAULT_LOCALE]) {
    const nested = (info as Record<string, { title?: string } | undefined>)[key];
    if (nested && typeof nested.title === 'string' && nested.title.trim()) {
      return nested.title.trim();
    }
  }
  const flat = (info as { title?: string }).title;
  if (typeof flat === 'string' && flat.trim()) return flat.trim();
  return fallback;
}

/** Fetch the OE `filter_chips_<catalog>` filter and adapt to a flat list of chip descriptors ordered by `position`. Marker mirrors `catalogKey` with hyphens swapped for underscores. */
export const loadFilterChips = cache(
  withTiming('loadFilterChips', async (catalogKey: string, langArg?: string): Promise<FilterChip[] | null> => {
    if (!isOneEntryEnabled) return null;
    const lang = langArg ?? (await currentCmsLocale());
    const marker = `filter_chips_${catalogKey.replace(/-/g, '_')}`;
    try {
      const result = await getApi().Filters.getFilterByMarker(marker, lang);
      if (isError(result)) return null;
      const raw = result as unknown as RawChipsFilter;
      const items = [...(raw.items ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const chips: FilterChip[] = [];
      for (const item of items) {
        const label = pickTitle(item.localizeInfos, lang, item.value ?? '');
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

/** Given the shopper-clicked chip label and the loaded descriptor list, return a partial `CatalogFilters` patch that applies the chip's filter effect. */
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

/** Map an OE attribute marker (e.g. `material_14`, `details_4`) onto the `CatalogFilters` list-field key that `matchesCatalogFilters` reads. */
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

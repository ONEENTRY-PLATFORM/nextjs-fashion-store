import { unstable_cache } from 'next/cache';

import type { Store } from '@/app/data/stores';
import { STORES as MOCK_STORES } from '@/app/data/stores';
import { REVALIDATE_STORES } from '@/lib/isr';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApiSafe, getImage, isError } from '@/lib/oneentry/index';
import { withTiming } from '@/lib/oneentry/profiling';
import { type Lang, t } from '@/lib/oneentry/system-text';

type RawAttrValue = { value?: unknown };
type RawPage = {
  id: number;
  pageUrl?: string;
  parentId?: number | null;
  position?: number;
  localizeInfos?: Record<string, { title?: string; menuTitle?: string }> | { title?: string; menuTitle?: string };
  attributeValues?: Record<string, RawAttrValue>;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

const extractTitle = (raw: RawPage, lang: Lang): string => {
  const li = raw.localizeInfos ?? {};
  // SDK may return localizeInfos flat (already picked for lang) or wrapped by lang.
  const flat = li as { title?: string; menuTitle?: string };
  if (typeof flat.title === 'string') return flat.title;
  const wrapped = (li as Record<string, { title?: string }>)[lang];
  return asString(wrapped?.title);
};

const splitAddressPostcode = (full: string): { address: string; postcode: string } => {
  // OneEntry stores address+postcode in one string like "214 Oxford Street, W1C 1AX". Split off the last token after the final comma when it looks like a postcode.
  const trimmed = full.trim();
  const lastComma = trimmed.lastIndexOf(',');
  if (lastComma === -1) return { address: trimmed, postcode: '' };
  const tail = trimmed.slice(lastComma + 1).trim();
  const head = trimmed.slice(0, lastComma).trim();
  // UK postcode roughly: 2-4 chars + space + 3 chars
  if (/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(tail)) {
    return { address: head, postcode: tail };
  }
  return { address: trimmed, postcode: '' };
};

const extractServices = (rawValue: unknown): string[] => {
  if (!Array.isArray(rawValue)) return [];
  return rawValue.map((it) => asString((it as { title?: unknown })?.title)).filter((s) => s.length > 0);
};

const padHM = (n: number): string => String(n).padStart(2, '0');

const formatHours = (rawValue: unknown, dayLabel: string): { day: string; time: string }[] => {
  // OneEntry stores opening hours as a timeInterval with recurring windows.
  if (!Array.isArray(rawValue) || rawValue.length === 0) return [];
  const out: { day: string; time: string }[] = [];
  for (const entry of rawValue) {
    const values = (entry as { values?: unknown[] }).values;
    if (!Array.isArray(values)) continue;
    for (const v of values) {
      const times = (v as { times?: unknown[] }).times;
      if (!Array.isArray(times)) continue;
      for (const t of times) {
        if (!Array.isArray(t) || t.length < 2) continue;
        const [from, to] = t as Array<{ hours?: number; minutes?: number }>;
        if (typeof from?.hours !== 'number' || typeof to?.hours !== 'number') continue;
        out.push({
          day: dayLabel,
          time: `${padHM(from.hours)}:${padHM(from.minutes ?? 0)} – ${padHM(to.hours)}:${padHM(to.minutes ?? 0)}`,
        });
      }
    }
  }
  return out;
};

/** OE stores the store tag/label as a single-value list attribute. */
const extractLabel = (rawValue: unknown): { title: string; value: string } => {
  if (!Array.isArray(rawValue) || rawValue.length === 0) return { title: '', value: '' };
  const first = rawValue[0] as { title?: unknown; value?: unknown };
  return {
    title: asString(first?.title),
    value: asString(first?.value),
  };
};

const normalize = (raw: RawPage, lang: Lang, dayLabel: string, mockFallback?: Store): Store => {
  const attrs = raw.attributeValues ?? {};
  const v = (k: string): string => asString(attrs[k]?.value);
  const rawAddress = v('page_store_address');
  const { address, postcode } = splitAddressPostcode(rawAddress);
  const picture = getImage(attrs['page_store_picture']?.value);
  const image = picture.url;
  const services = extractServices(attrs['page_store_services']?.value);
  const hours = formatHours(attrs['page_store_hours']?.value, dayLabel);
  const label = extractLabel(attrs['page_store_lable']?.value);
  const mapUrl = v('page_store_directions');
  return {
    id: raw.pageUrl ?? `oe-${raw.id}`,
    oeId: raw.id,
    name: extractTitle(raw, lang) || mockFallback?.name || '',
    city: v('page_store_city') || mockFallback?.city || '',
    address: address || mockFallback?.address || '',
    postcode: postcode || mockFallback?.postcode || '',
    phone: v('page_store_phone') || mockFallback?.phone || '',
    email: v('page_store_email') || mockFallback?.email || '',
    instagram: v('page_store_instagram') || mockFallback?.instagram || '',
    hours: hours.length > 0 ? hours : (mockFallback?.hours ?? []),
    services: services.length > 0 ? services : (mockFallback?.services ?? []),
    image: image || mockFallback?.image || '',
    // Only meaningful when the CMS picture won above; a mock fallback has none.
    ...(image && picture.blur ? { imageBlur: picture.blur } : {}),
    mapUrl: mapUrl || mockFallback?.mapUrl || '',
    isflagship: label.value === 'flagship' || mockFallback?.isflagship || false,
    tag: label.title || mockFallback?.tag || undefined,
  };
};

/** `lang` is an explicit argument so it lands in the `unstable_cache` key. */
const loadStoresCached = withTiming(
  'loadStores',
  unstable_cache(
    async (lang: Lang, dayLabel: string): Promise<Store[]> => {
      // Mock fallback so all stores render even while a few OE store pages remain partially filled.
      const api = getApiSafe();
      if (!api) return MOCK_STORES;
      try {
        const result = await api.Pages.getChildPagesByParentUrl('stores', lang);
        if (isError(result)) return MOCK_STORES;
        const items = (
          Array.isArray(result) ? result : ((result as { items?: RawPage[] } | null)?.items ?? [])
        ) as RawPage[];
        const sorted = items.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        if (sorted.length === 0) return MOCK_STORES;
        return sorted.map((raw, idx) => normalize(raw, lang, dayLabel, MOCK_STORES[idx]));
      } catch {
        return MOCK_STORES;
      }
    },
    ['oe-stores'],
    { revalidate: REVALIDATE_STORES, tags: ['oe-stores'] },
  ),
);

/** Store list for the current route's locale. */
export async function loadStores(langArg?: Lang): Promise<Store[]> {
  const lang = langArg ?? (await currentCmsLocale());
  // Read outside `unstable_cache` so the label isn't pinned for the whole stores TTL; `getSystemSet` has its own 5-minute cache.
  const dayLabel = await t('store_location', 'store_location_card_hours_day_default', 'Mon – Sun', lang);
  return loadStoresCached(lang, dayLabel);
}

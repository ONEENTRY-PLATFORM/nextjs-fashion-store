/** Which form module-configs are premoderated, read off the catalog's own configs. */
import { cache } from 'react';

import { getApiSafe, isError } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { logCaught } from '@/lib/oneentry/log';

const TTL_MS = 5 * 60 * 1000;

let cachedMap: { at: number; value: Map<number, boolean> } | null = null;
let inflight: Promise<Map<number, boolean>> | null = null;

/**
 * Probe the moderation flags once.
 *
 * `isModerate` is only delivered through the products/pages API — never through
 * `Forms.getFormByMarker` — so the flag has to be read off a product. The
 * configs are the module's, not the product's, so they are identical for every
 * product: one probe with `limit: 1` answers for the whole catalog.
 */
async function fetchModerationMap(): Promise<Map<number, boolean>> {
  const map = new Map<number, boolean>();
  const api = getApiSafe();
  if (!api) return map;
  try {
    const products = await api.Products.getProducts([], DEFAULT_LOCALE, { offset: 0, limit: 1 });
    if (isError(products)) return map;
    const item = products.items?.[0];
    for (const cfg of item?.moduleFormConfigs ?? []) {
      if (typeof cfg.id === 'number' && typeof cfg.isModerate === 'boolean') {
        map.set(cfg.id, cfg.isModerate);
      }
    }
  } catch (err) {
    logCaught('moderation.fetchModerationMap', err);
  }
  return map;
}

/**
 * Whether records of one form module-config go through premoderation.
 *
 * Answers `false` when the flag cannot be read: an unmoderated config leaves
 * records in `sent`, so assuming moderation would filter every review out of
 * the list instead of showing it. Guessing in that direction empties the page;
 * guessing the other way at worst shows a review a moment early.
 */
export const isConfigModerated = cache(async (configId: number): Promise<boolean> => {
  const now = Date.now();
  if (cachedMap && now - cachedMap.at < TTL_MS) return cachedMap.value.get(configId) ?? false;
  if (!inflight) {
    inflight = fetchModerationMap()
      .then((value) => {
        cachedMap = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
  }
  const map = await inflight;
  return map.get(configId) ?? false;
});

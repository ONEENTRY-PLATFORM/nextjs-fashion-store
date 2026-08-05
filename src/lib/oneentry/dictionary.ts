import { cache } from 'react';
import { getApiSafe, isError } from './index';
import { DEFAULT_LOCALE } from './locale';
import type { Lang } from './system-text';
import { logCaught } from './log';

/**
 * The storefront's UI-text dictionary: every attribute marker the CMS knows,
 * flattened to `marker → value`.
 *
 * Copy lives as each attribute's `initialValue` — the field a content editor
 * fills in the admin panel's attribute-set editor. Markers are unique across
 * sets on this tenant (verified: 244 markers, zero collisions), so the sets are
 * an admin-side grouping only and callers never need to know which set a key
 * came from. One lookup, one namespace.
 *
 * Read it with `useDict()` on the client or `getDictionary()` on the server;
 * every call site supplies its own English fallback inline, so a CMS outage
 * degrades to the shipped copy rather than blank UI.
 */
export type Dictionary = Record<string, string>;

/** OE returns `initialValue` either flat or language-keyed depending on the call. */
type RawAttr = {
  identifier?: unknown;
  marker?: unknown;
  initialValue?: unknown;
};
type RawSet = { schema?: Record<string, RawAttr> | null };

const readValue = (raw: unknown, lang: Lang): string | null => {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return null;
  const langKeyed = (raw as Record<string, { value?: unknown }>)[lang];
  if (langKeyed && typeof langKeyed.value === 'string') return langKeyed.value;
  const flat = (raw as { value?: unknown }).value;
  return typeof flat === 'string' ? flat : null;
};

// Process-wide TTL cache. UI copy changes rarely, and `React.cache()` alone only
// dedupes within a single render — without this every Server Action would refetch
// the whole dictionary.
const TTL_MS = 5 * 60 * 1000;
let cached: { at: number; value: Dictionary } | null = null;
let inflight: Promise<Dictionary> | null = null;

/** How many sets the tenant returns per page. The API caps this server-side and
 *  ignores a larger `limit`, so we page until we've seen `total`. */
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

async function fetchDictionary(lang: Lang): Promise<Dictionary> {
  const api = getApiSafe();
  if (!api) return {};
  const dict: Dictionary = {};
  try {
    let offset = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await api.AttributesSets.getAttributes(lang, offset, PAGE_SIZE);
      if (isError(res)) break;
      const payload = res as unknown as { items?: RawSet[]; total?: number } | RawSet[];
      const items = Array.isArray(payload) ? payload : payload?.items ?? [];
      if (items.length === 0) break;

      for (const set of items) {
        for (const attr of Object.values(set?.schema ?? {})) {
          const marker = typeof attr?.identifier === 'string'
            ? attr.identifier
            : typeof attr?.marker === 'string' ? attr.marker : '';
          if (!marker) continue;
          const value = readValue(attr?.initialValue, lang);
          // First writer wins: markers are unique tenant-wide, and skipping
          // empties keeps a blank attribute from masking a real value.
          if (value && value.length > 0 && dict[marker] === undefined) dict[marker] = value;
        }
      }

      const total = Array.isArray(payload) ? items.length : payload?.total ?? items.length;
      offset += items.length;
      if (offset >= total) break;
    }
    return dict;
  } catch (err) {
    logCaught('dictionary.fetchDictionary', err);
    return dict;
  }
}

/**
 * Load the whole dictionary. Server-side; pass it to `DictProvider` for client
 * components.
 *
 * Never throws — an unreachable CMS yields an empty dictionary and every call
 * site falls back to its inline English copy.
 */
export const getDictionary = cache(async (lang: Lang = DEFAULT_LOCALE): Promise<Dictionary> => {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.value;
  if (inflight) return inflight;
  inflight = fetchDictionary(lang)
    .then((value) => {
      // Only cache a non-empty result: a transient blip must not pin an empty
      // dictionary for the whole TTL and blank every label app-wide.
      if (Object.keys(value).length > 0) cached = { at: Date.now(), value };
      return value;
    })
    .finally(() => { inflight = null; });
  return inflight;
});

/** Resolve one marker against a dictionary, falling back to the shipped copy. */
export function translate(dict: Dictionary | null | undefined, marker: string, fallback: string): string {
  const v = dict?.[marker];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

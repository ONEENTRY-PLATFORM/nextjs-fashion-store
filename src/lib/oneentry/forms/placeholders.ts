import { cache } from 'react';
import { oneentry, isError } from '../index';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';
import { logCaught } from '../log';

/**
 * Placeholders pulled from a OE form's attribute `additionalFields`.
 * Shape: `{ <attributeMarker>: { <additionalFieldMarker>: <stringValue> } }`.
 *
 * Example for the `user_addresses` form:
 *   {
 *     user_addresses_lable: { placeholder_label: 'Home' },
 *     user_addresses_recipient_name: { placeholder_name: 'Jane Smith' },
 *     ...
 *   }
 */
export type FormPlaceholders = Record<string, Record<string, string>>;

type RawAdditionalField = { value?: unknown } | null | undefined;
type RawAttribute = {
  marker?: unknown;
  additionalFields?: Record<string, RawAdditionalField> | null;
};
type RawForm = { attributes?: RawAttribute[] } | null | undefined;

const TTL_MS = 5 * 60 * 1000;
// LRU cap on the process-wide in-memory cache. Form markers × lang combos are
// finite in practice (~10–20 forms per tenant), but a buggy caller that
// synthesises new marker strings (path typos, template loops) could otherwise
// grow the Map unbounded and slowly leak memory. Insertion-order-based
// eviction gives LRU-on-write semantics via the delete/set pair below.
const FORM_CACHE_MAX_ENTRIES = 200;
const formCache = new Map<string, { at: number; value: FormPlaceholders }>();
const inflight = new Map<string, Promise<FormPlaceholders>>();

function touchFormCache(key: string, entry: { at: number; value: FormPlaceholders }) {
  if (formCache.has(key)) formCache.delete(key);
  formCache.set(key, entry);
  if (formCache.size > FORM_CACHE_MAX_ENTRIES) {
    const oldest = formCache.keys().next().value;
    if (oldest !== undefined) formCache.delete(oldest);
  }
}

async function fetchFormPlaceholders(
  marker: string,
  lang: Lang,
): Promise<FormPlaceholders> {
  if (!oneentry) return {};
  try {
    const raw = await oneentry.Forms.getFormByMarker(marker, lang);
    if (isError(raw)) return {};
    const form = raw as RawForm;
    if (!form || !Array.isArray(form.attributes)) return {};
    const out: FormPlaceholders = {};
    for (const attr of form.attributes) {
      const attrMarker = typeof attr?.marker === 'string' ? attr.marker : '';
      if (!attrMarker) continue;
      const af = attr.additionalFields;
      if (!af || typeof af !== 'object') continue;
      const inner: Record<string, string> = {};
      for (const [fieldMarker, field] of Object.entries(af)) {
        const v = field?.value;
        if (typeof v === 'string' && v.length > 0) inner[fieldMarker] = v;
      }
      if (Object.keys(inner).length > 0) out[attrMarker] = inner;
    }
    return out;
  } catch (err) {
    logCaught(`placeholders.fetchFormPlaceholders(${marker}, ${lang})`, err);
    return {};
  }
}

export const loadFormPlaceholders = cache(
  async (marker: string, lang: Lang = DEFAULT_LOCALE): Promise<FormPlaceholders> => {
    const key = `${marker}|${lang}`;
    const now = Date.now();
    const cached = formCache.get(key);
    if (cached && now - cached.at < TTL_MS) return cached.value;
    const pending = inflight.get(key);
    if (pending) return pending;
    const p = fetchFormPlaceholders(marker, lang)
      .then((value) => {
        touchFormCache(key, { at: Date.now(), value });
        return value;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, p);
    return p;
  },
);

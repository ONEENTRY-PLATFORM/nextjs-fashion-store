import { cache } from 'react';
import { oneentry, isError } from '../index';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';

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
const formCache = new Map<string, { at: number; value: FormPlaceholders }>();
const inflight = new Map<string, Promise<FormPlaceholders>>();

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
  } catch {
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
        formCache.set(key, { at: Date.now(), value });
        return value;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, p);
    return p;
  },
);

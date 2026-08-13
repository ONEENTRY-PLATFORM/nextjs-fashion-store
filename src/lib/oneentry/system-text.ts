import { cache } from 'react';

import { getApiSafe, isError } from './index';
import { DEFAULT_LOCALE } from './locale';
import { logCaught } from './log';

/** OE locale code accepted by the SDK (`en_US`, `fr_FR`, …). */
export type Lang = string;

/** OE returns the attribute-set schema in two shapes depending on which call surfaces it. */
type SystemAttrItem = {
  type?: string;
  identifier?: string;
  initialValue?: Partial<Record<Lang, { value?: string | null }>> | { value?: string | null };
  localizeInfos?: Partial<Record<Lang, { title?: string }>> | { title?: string };
};

export type SystemSchema = Record<string, SystemAttrItem>;

/** Extract the string value from a system-text attribute item, working with both the language-keyed shape and the already-flattened SDK shape. */
export function readSystemValue(item: SystemAttrItem | undefined, lang: Lang = DEFAULT_LOCALE): string | null {
  if (!item) return null;
  const iv = item.initialValue;
  if (!iv || typeof iv !== 'object') return null;
  const langKeyed = (iv as Partial<Record<Lang, { value?: string | null }>>)[lang];
  if (langKeyed && typeof langKeyed.value === 'string') return langKeyed.value;
  const flat = (iv as { value?: string | null }).value;
  if (typeof flat === 'string') return flat;
  return null;
}

type AttributeSet = { schema?: SystemSchema | unknown } | null | undefined;

// Process-wide TTL cache for OE attribute sets.
const SYSTEM_SET_TTL_MS = 5 * 60 * 1000;
// Hard cap the in-memory cache so a buggy caller that keeps synthesising new markers (typo loops, misconfigured labels) can't grow the Map unbounded in a long-lived Node process.
const SYSTEM_SET_MAX_ENTRIES = 200;
const systemSetCache = new Map<string, { at: number; value: SystemSchema }>();
const systemSetInflight = new Map<string, Promise<SystemSchema>>();

function touchSystemSet(key: string, value: { at: number; value: SystemSchema }) {
  if (systemSetCache.has(key)) systemSetCache.delete(key);
  systemSetCache.set(key, value);
  if (systemSetCache.size > SYSTEM_SET_MAX_ENTRIES) {
    const oldest = systemSetCache.keys().next().value;
    if (oldest !== undefined) systemSetCache.delete(oldest);
  }
}

async function fetchSystemSet(marker: string, lang: Lang): Promise<SystemSchema> {
  const api = getApiSafe();
  if (!api) return {};
  try {
    const raw = await api.AttributesSets.getAttributeSetByMarker(marker, lang);
    if (isError(raw)) return {};
    const set = raw as AttributeSet;
    const schema = set?.schema;
    if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
      return schema as SystemSchema;
    }
    return {};
  } catch (err) {
    logCaught(`system-text.fetchSystemSet(${marker}, ${lang})`, err);
    return {};
  }
}

export const getSystemSet = cache(async (marker: string, lang: Lang = DEFAULT_LOCALE): Promise<SystemSchema> => {
  const key = `${marker}|${lang}`;
  const now = Date.now();
  const cached = systemSetCache.get(key);
  if (cached && now - cached.at < SYSTEM_SET_TTL_MS) return cached.value;
  const inflight = systemSetInflight.get(key);
  if (inflight) return inflight;
  const p = fetchSystemSet(marker, lang)
    .then((value) => {
      // Only cache non-empty results — a transient OE hiccup (network blip, brief 500) should NOT poison labels for the whole TTL.
      if (Object.keys(value).length > 0) {
        touchSystemSet(key, { at: Date.now(), value });
      }
      return value;
    })
    .finally(() => {
      systemSetInflight.delete(key);
    });
  systemSetInflight.set(key, p);
  return p;
});

export async function t(marker: string, key: string, fallback: string, lang: Lang = DEFAULT_LOCALE): Promise<string> {
  const schema = await getSystemSet(marker, lang);
  const value = readSystemValue(schema?.[key], lang);
  return value && value.length > 0 ? value : fallback;
}

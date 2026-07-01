import { cache } from 'react';
import { oneentry } from './index';

export type Lang = 'en_US';

/** OE returns the attribute-set schema in two shapes depending on which call
 *  surfaces it. The REST `/attributes-sets/marker/{m}` endpoint returns
 *  `initialValue: { en_US: { value: 'Share' } }` (language-keyed), but the
 *  TypeScript SDK call `AttributesSets.getAttributeSetByMarker` flattens it to
 *  `initialValue: { value: 'Share' }` once it's already resolved against the
 *  requested locale. The reader needs to accept both. */
type SystemAttrItem = {
  type?: string;
  identifier?: string;
  initialValue?:
    | Partial<Record<Lang, { value?: string | null }>>
    | { value?: string | null };
  localizeInfos?:
    | Partial<Record<Lang, { title?: string }>>
    | { title?: string };
};

export type SystemSchema = Record<string, SystemAttrItem>;

/** Extract the string value from a system-text attribute item, working with
 *  both the language-keyed shape and the already-flattened SDK shape. */
export function readSystemValue(
  item: SystemAttrItem | undefined,
  lang: Lang = 'en_US',
): string | null {
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

// Process-wide TTL cache for OE attribute sets. UI labels rarely change; the
// previous setup re-fetched every set on every Server Action because
// `React.cache()` only memoizes within a single HTTP request. Holding the
// result for a few minutes avoids the per-request 200–500 ms penalty on
// label-heavy pages.
const SYSTEM_SET_TTL_MS = 5 * 60 * 1000;
const systemSetCache = new Map<string, { at: number; value: SystemSchema }>();
const systemSetInflight = new Map<string, Promise<SystemSchema>>();

async function fetchSystemSet(marker: string, lang: Lang): Promise<SystemSchema> {
  if (!oneentry) return {};
  try {
    const set = (await oneentry.AttributesSets.getAttributeSetByMarker(
      marker,
      lang,
    )) as AttributeSet;
    const schema = set?.schema;
    if (schema && typeof schema === 'object' && !Array.isArray(schema)) {
      return schema as SystemSchema;
    }
    return {};
  } catch {
    return {};
  }
}

export const getSystemSet = cache(
  async (marker: string, lang: Lang = 'en_US'): Promise<SystemSchema> => {
    const key = `${marker}|${lang}`;
    const now = Date.now();
    const cached = systemSetCache.get(key);
    if (cached && now - cached.at < SYSTEM_SET_TTL_MS) return cached.value;
    const inflight = systemSetInflight.get(key);
    if (inflight) return inflight;
    const p = fetchSystemSet(marker, lang)
      .then((value) => {
        systemSetCache.set(key, { at: Date.now(), value });
        return value;
      })
      .finally(() => {
        systemSetInflight.delete(key);
      });
    systemSetInflight.set(key, p);
    return p;
  },
);

export async function t(
  marker: string,
  key: string,
  fallback: string,
  lang: Lang = 'en_US',
): Promise<string> {
  const schema = await getSystemSet(marker, lang);
  const value = readSystemValue(schema?.[key], lang);
  return value && value.length > 0 ? value : fallback;
}

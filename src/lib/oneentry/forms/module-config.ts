/** Resolve a form's module-config id from the CMS instead of hardcoding it. */
import { cache } from 'react';

import { getApiSafe, isError } from '@/lib/oneentry/index';
import { logCaught } from '@/lib/oneentry/log';
import type { Lang } from '@/lib/oneentry/system-text';

const TTL_MS = 5 * 60 * 1000;
const idCache = new Map<string, { at: number; value: number | null }>();
const inflight = new Map<string, Promise<number | null>>();

async function fetchModuleConfigId(marker: string, lang: Lang): Promise<number | null> {
  const api = getApiSafe();
  if (!api) return null;
  try {
    const raw = await api.Forms.getFormByMarker(marker, lang);
    if (isError(raw)) return null;
    const id = raw.moduleFormConfigs?.[0]?.id;
    return typeof id === 'number' ? id : null;
  } catch (err) {
    logCaught(`module-config.fetchModuleConfigId(${marker}, ${lang})`, err);
    return null;
  }
}

/**
 * Load `moduleFormConfigs[0].id` for one form, falling back to a literal.
 *
 * Hardcoding this id is the failure the CMS makes silent: it changes whenever
 * the form is recreated in the admin panel, and the code keeps compiling — the
 * feature just stops working. Reads answer `400 Incorrect formIdentifier for
 * provided config` or return nothing at all, depending on the endpoint.
 *
 * The `fallback` keeps the feature alive while the CMS is unreachable; it is a
 * safety net, not the source of truth.
 */
export const loadFormModuleConfigId = cache(
  async (marker: string, lang: Lang, fallback: number): Promise<number> => {
    const key = `${marker}|${lang}`;
    const now = Date.now();
    const cached = idCache.get(key);
    if (cached && now - cached.at < TTL_MS) return cached.value ?? fallback;
    const pending = inflight.get(key);
    if (pending) return (await pending) ?? fallback;
    const p = fetchModuleConfigId(marker, lang)
      .then((value) => {
        idCache.set(key, { at: Date.now(), value });
        return value;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, p);
    return (await p) ?? fallback;
  },
);

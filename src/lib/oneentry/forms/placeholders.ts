import { cache } from 'react';

import { currentCmsLocale } from '../current-locale';
import { getApiSafe, isError } from '../index';
import { logCaught } from '../log';
import type { Lang } from '../system-text';
import type { FormContent, FormPlaceholders } from './form-content';
import { EMPTY_FORM_CONTENT } from './form-content';

// Re-exported so existing importers keep their current specifier; the
// definitions live in a client-safe module (see `form-content.ts`), because
// this file reaches for `next/root-params` and cannot enter a client bundle.
export type { FormAttributeContent, FormContent, FormPlaceholders } from './form-content';
export { EMPTY_FORM_CONTENT } from './form-content';

type RawLocalize = { title?: unknown } & Record<string, unknown>;
type RawAdditionalField = { value?: unknown } | null | undefined;
type RawListTitle = { title?: unknown; value?: unknown; position?: unknown };
type RawAttribute = {
  marker?: unknown;
  localizeInfos?: RawLocalize | null;
  additionalFields?: Record<string, RawAdditionalField> | null;
  listTitles?: RawListTitle[] | null;
};
type RawForm =
  | {
      localizeInfos?: RawLocalize | null;
      attributes?: RawAttribute[];
    }
  | null
  | undefined;

const TTL_MS = 5 * 60 * 1000;
// LRU cap on the process-wide in-memory cache. Form markers × lang combos are
// finite in practice (~10–20 forms per tenant), but a buggy caller that
// synthesises new marker strings (path typos, template loops) could otherwise
// grow the Map unbounded and slowly leak memory. Insertion-order-based
// eviction gives LRU-on-write semantics via the delete/set pair below.
const FORM_CACHE_MAX_ENTRIES = 200;
const formCache = new Map<string, { at: number; value: FormContent }>();
const inflight = new Map<string, Promise<FormContent>>();

function touchFormCache(key: string, entry: { at: number; value: FormContent }) {
  if (formCache.has(key)) formCache.delete(key);
  formCache.set(key, entry);
  if (formCache.size > FORM_CACHE_MAX_ENTRIES) {
    const oldest = formCache.keys().next().value;
    if (oldest !== undefined) formCache.delete(oldest);
  }
}

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * OE returns `localizeInfos` either language-keyed (`{en_US: {title}}`) or
 * already flattened against the requested locale (`{title}`). Accept both.
 */
function localized(info: RawLocalize | null | undefined, lang: Lang): Record<string, unknown> {
  if (!info || typeof info !== 'object') return {};
  const langKeyed = info[lang];
  if (langKeyed && typeof langKeyed === 'object') return langKeyed as Record<string, unknown>;
  return info as Record<string, unknown>;
}

async function fetchFormContent(marker: string, lang: Lang): Promise<FormContent> {
  const api = getApiSafe();
  if (!api) return EMPTY_FORM_CONTENT;
  try {
    const raw = await api.Forms.getFormByMarker(marker, lang);
    if (isError(raw)) return EMPTY_FORM_CONTENT;
    // The SDK's `IFormsEntity` narrows `localizeInfos` to a per-locale shape
    // that doesn't overlap our permissive reader (OE also returns the already
    // flattened form), so route the cast through `unknown`.
    const form = raw as unknown as RawForm;
    if (!form) return EMPTY_FORM_CONTENT;

    const formInfo = localized(form.localizeInfos, lang);
    const out: FormContent = {
      title: asString(formInfo.title),
      titleForSite: asString(formInfo.titleForSite),
      successMessage: asString(formInfo.successMessage),
      unsuccessMessage: asString(formInfo.unsuccessMessage),
      attributes: {},
    };

    for (const attr of Array.isArray(form.attributes) ? form.attributes : []) {
      const attrMarker = asString(attr?.marker);
      if (!attrMarker) continue;

      const fields: Record<string, string> = {};
      const af = attr.additionalFields;
      if (af && typeof af === 'object') {
        for (const [fieldMarker, field] of Object.entries(af)) {
          const v = field?.value;
          if (typeof v === 'string' && v.length > 0) fields[fieldMarker] = v;
        }
      }

      const options = (Array.isArray(attr.listTitles) ? attr.listTitles : [])
        .map((o) => ({
          title: asString(o?.title),
          value: asString(o?.value),
          position: typeof o?.position === 'number' ? o.position : 0,
        }))
        .filter((o) => o.value.length > 0)
        .sort((a, b) => a.position - b.position)
        .map(({ title, value }) => ({ title, value }));

      out.attributes[attrMarker] = {
        title: asString(localized(attr.localizeInfos, lang).title),
        fields,
        options,
      };
    }

    return out;
  } catch (err) {
    logCaught(`placeholders.fetchFormContent(${marker}, ${lang})`, err);
    return EMPTY_FORM_CONTENT;
  }
}

/**
 * Load a form's authored content (labels, placeholders, options, messages).
 *
 * Cached per `marker|lang` for 5 minutes; concurrent callers share one inflight
 * request. Never throws — a missing or erroring form resolves to
 * {@link EMPTY_FORM_CONTENT} so screens fall back to their local copy.
 */
export const loadFormContent = cache(async (marker: string, langArg?: Lang): Promise<FormContent> => {
  const lang = langArg ?? (await currentCmsLocale());
  const key = `${marker}|${lang}`;
  const now = Date.now();
  const cached = formCache.get(key);
  if (cached && now - cached.at < TTL_MS) return cached.value;
  const pending = inflight.get(key);
  if (pending) return pending;
  const p = fetchFormContent(marker, lang)
    .then((value) => {
      touchFormCache(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
});

/**
 * Back-compat wrapper returning only `additionalFields`.
 *
 * @deprecated Prefer {@link loadFormContent}, which also carries field labels,
 * option lists and the form's success/failure messages.
 */
export async function loadFormPlaceholders(marker: string, langArg?: Lang): Promise<FormPlaceholders> {
  const lang = langArg ?? (await currentCmsLocale());
  const content = await loadFormContent(marker, lang);
  const out: FormPlaceholders = {};
  for (const [attrMarker, attr] of Object.entries(content.attributes)) {
    if (Object.keys(attr.fields).length > 0) out[attrMarker] = attr.fields;
  }
  return out;
}

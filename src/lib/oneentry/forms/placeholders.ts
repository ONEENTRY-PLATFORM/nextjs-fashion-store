import { cache } from 'react';
import { getApiSafe, isError } from '../index';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';
import { logCaught } from '../log';

/**
 * Content authored on a OneEntry **form** entity.
 *
 * Form copy is a different storage location from the system-text sets read by
 * `use*T` — a form owns its own field labels, placeholders, option lists and
 * result messages, so this is where that copy belongs. See
 * `docs/HARDCODED_TEXTS.md` §4 for why the two must not be mixed.
 *
 * Shape per attribute:
 *   title   ← `attributes[].localizeInfos.{lang}.title`
 *   fields  ← `attributes[].additionalFields` → `{marker: value}`
 *   options ← `attributes[].listTitles` (for `list` attributes)
 */
export interface FormAttributeContent {
  /** Field label as authored in the admin panel. */
  title: string;
  /** `additionalFields` flattened to `{fieldMarker: value}` — placeholders etc. */
  fields: Record<string, string>;
  /** Option list for `list` attributes, ordered by `position`. */
  options: Array<{ title: string; value: string }>;
}

/** Whole-form content: result messages plus every attribute's copy. */
export interface FormContent {
  /** Internal admin title. */
  title: string;
  /** Public-facing heading (`titleForSite`), often the modal title. */
  titleForSite: string;
  /** Message shown after a successful submit. */
  successMessage: string;
  /** Message shown after a failed submit. */
  unsuccessMessage: string;
  /** Keyed by attribute marker. */
  attributes: Record<string, FormAttributeContent>;
}

/**
 * Legacy shape: `{attributeMarker: {additionalFieldMarker: value}}`.
 *
 * Retained because `useFormPlaceholder` consumers were written against it.
 * New code should prefer {@link FormContent}.
 */
export type FormPlaceholders = Record<string, Record<string, string>>;

export const EMPTY_FORM_CONTENT: FormContent = {
  title: '',
  titleForSite: '',
  successMessage: '',
  unsuccessMessage: '',
  attributes: {},
};

type RawLocalize = { title?: unknown } & Record<string, unknown>;
type RawAdditionalField = { value?: unknown } | null | undefined;
type RawListTitle = { title?: unknown; value?: unknown; position?: unknown };
type RawAttribute = {
  marker?: unknown;
  localizeInfos?: RawLocalize | null;
  additionalFields?: Record<string, RawAdditionalField> | null;
  listTitles?: RawListTitle[] | null;
};
type RawForm = {
  localizeInfos?: RawLocalize | null;
  attributes?: RawAttribute[];
} | null | undefined;

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
export const loadFormContent = cache(
  async (marker: string, lang: Lang = DEFAULT_LOCALE): Promise<FormContent> => {
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
  },
);

/**
 * Back-compat wrapper returning only `additionalFields`.
 *
 * @deprecated Prefer {@link loadFormContent}, which also carries field labels,
 * option lists and the form's success/failure messages.
 */
export async function loadFormPlaceholders(
  marker: string,
  lang: Lang = DEFAULT_LOCALE,
): Promise<FormPlaceholders> {
  const content = await loadFormContent(marker, lang);
  const out: FormPlaceholders = {};
  for (const [attrMarker, attr] of Object.entries(content.attributes)) {
    if (Object.keys(attr.fields).length > 0) out[attrMarker] = attr.fields;
  }
  return out;
}

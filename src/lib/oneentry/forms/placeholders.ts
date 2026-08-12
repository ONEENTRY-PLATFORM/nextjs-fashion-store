import { cache } from 'react';

import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApiSafe, isError } from '@/lib/oneentry/index';
import { logCaught } from '@/lib/oneentry/log';
import type { Lang } from '@/lib/oneentry/system-text';

import type { FieldLimits, FormContent, FormFieldOption, FormPlaceholders } from './form-content';
import { EMPTY_FORM_CONTENT, NO_FIELD_LIMITS } from './form-content';

// Re-exported so existing importers keep their current specifier; the
// definitions live in a client-safe module (see `form-content.ts`), because
// this file reaches for `next/root-params` and cannot enter a client bundle.
export type {
  FieldLimits,
  FormAttributeContent,
  FormContent,
  FormFieldOption,
  FormFieldType,
  FormPlaceholders,
} from './form-content';
export { EMPTY_FORM_CONTENT, NO_FIELD_LIMITS } from './form-content';

type RawLocalize = { title?: unknown } & Record<string, unknown>;
type RawAdditionalField = { value?: unknown } | null | undefined;
/**
 * `value` is a plain string on `list` attributes and an object referencing an
 * OE page on `entity` ones (`{id, depth, parentId, position}`).
 */
type RawListTitle = {
  title?: unknown;
  value?: unknown;
  position?: unknown;
  extended?: { value?: unknown } | null;
};
type RawValidators = {
  requiredValidator?: { strict?: unknown } | boolean | null;
  emailInspectionValidator?: unknown;
  trimValidator?: unknown;
  stringInspectionValidator?: { stringMin?: unknown; stringMax?: unknown } | null;
} | null;
type RawAttribute = {
  marker?: unknown;
  type?: unknown;
  position?: unknown;
  isVisible?: unknown;
  localizeInfos?: RawLocalize | null;
  additionalFields?: Record<string, RawAdditionalField> | null;
  listTitles?: RawListTitle[] | null;
  validators?: RawValidators;
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
 * OE writes the string-length bounds as either a number or a numeric string
 * (`"10"`), and uses `0` to mean "no bound" — a literal 0 would otherwise read
 * as "must be empty" and reject every value.
 */
function asBound(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Decode an attribute's `validators` block into the limits the UI enforces. */
function readLimits(validators: RawValidators | undefined): FieldLimits {
  if (!validators || typeof validators !== 'object') return NO_FIELD_LIMITS;
  const si = validators.stringInspectionValidator;
  return {
    required: Boolean(validators.requiredValidator),
    min: si && typeof si === 'object' ? asBound(si.stringMin) : null,
    max: si && typeof si === 'object' ? asBound(si.stringMax) : null,
    email: Boolean(validators.emailInspectionValidator),
    trim: Boolean(validators.trimValidator),
  };
}

/** Numeric member of an `entity` option's `value` object, or `null`. */
function refField(value: unknown, key: 'id' | 'depth' | 'parentId'): number | null {
  if (!value || typeof value !== 'object') return null;
  const n = (value as Record<string, unknown>)[key];
  return typeof n === 'number' ? n : null;
}

/**
 * Decode one `listTitles` entry.
 *
 * A `list` option's `value` is the string that gets submitted. An `entity`
 * option's is an object pointing at an OE page, in which case the page id
 * doubles as the submitted value.
 */
function readOption(raw: RawListTitle): FormFieldOption & { position: number } {
  const entityId = refField(raw?.value, 'id');
  return {
    title: asString(raw?.title),
    value: entityId != null ? String(entityId) : asString(raw?.value),
    extended: asString(raw?.extended?.value),
    entityId,
    depth: refField(raw?.value, 'depth'),
    parentId: refField(raw?.value, 'parentId'),
    position: typeof raw?.position === 'number' ? raw.position : 0,
  };
}

/**
 * Pick the attribute's placeholder out of its `additionalFields`.
 *
 * Admins name the field per attribute — `placeholder_city`,
 * `placeholder_address_line_1`, or a bare `placeholder` — so the prefix is the
 * only stable part. Ties are broken by marker order to stay deterministic.
 */
function readPlaceholder(fields: Record<string, string>): string {
  const marker = Object.keys(fields)
    .filter((k) => k.toLowerCase().startsWith('placeholder'))
    .sort()[0];
  return marker ? fields[marker] : '';
}

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
      fields: [],
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
        .map(readOption)
        .filter((o) => o.value.length > 0)
        .sort((a, b) => a.position - b.position)
        .map(({ position: _position, ...option }) => option);

      out.attributes[attrMarker] = {
        marker: attrMarker,
        type: asString(attr.type),
        position: typeof attr.position === 'number' ? attr.position : 0,
        // Absent means visible: OE only ever sends `false` to hide a field, and
        // an older payload without the flag must not blank the whole form.
        isVisible: attr.isVisible !== false,
        title: asString(localized(attr.localizeInfos, lang).title),
        placeholder: readPlaceholder(fields),
        fields,
        options,
        limits: readLimits(attr.validators),
      };
    }

    out.fields = Object.values(out.attributes).sort((a, b) => a.position - b.position);

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

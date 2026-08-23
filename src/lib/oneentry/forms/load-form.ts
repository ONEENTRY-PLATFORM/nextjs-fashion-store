/** Fetch and decode an OE form, for an explicitly named locale. */
import type { IAttributeValidators, IFormAttribute, IListTitle } from 'oneentry/types';
import { cache } from 'react';

import { getApiSafe, isError } from '@/lib/oneentry/index';
import { logCaught } from '@/lib/oneentry/log';
import type { Lang } from '@/lib/oneentry/system-text';

import type { FieldLimits, FormContent, FormFieldOption } from './form-content';
import { EMPTY_FORM_CONTENT, NO_FIELD_LIMITS } from './form-content';

/** Envelope of `Forms.getFormByMarker`, with the form-level localization widened. */
type RawLocalize = { title?: unknown } & Record<string, unknown>;
type RawForm =
  | {
      localizeInfos?: RawLocalize | null;
      attributes?: IFormAttribute[];
    }
  | null
  | undefined;

const TTL_MS = 5 * 60 * 1000;
// LRU cap on the process-wide in-memory cache.
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

/** OE writes the string-length bounds as either a number or a numeric string (`"10"`), and uses `0` to mean "no bound". */
function asBound(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Decode an attribute's `validators` block into the limits the UI enforces. */
function readLimits(validators: IAttributeValidators | undefined): FieldLimits {
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

/** Decode one `listTitles` entry. */
function readOption(raw: IListTitle): FormFieldOption & { position: number } {
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

/** Pick the attribute's placeholder out of its `additionalFields`. Admins name the field per attribute so the prefix is the only stable part. */
function readPlaceholder(fields: Record<string, string>): string {
  const marker = Object.keys(fields)
    .filter((k) => k.toLowerCase().startsWith('placeholder'))
    .sort()[0];
  return marker ? fields[marker] : '';
}

/** OE returns `localizeInfos` either language-keyed (`{en_US: {title}}`) or already flattened against the requested locale. */
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
    // The SDK's `IFormsEntity` narrows `localizeInfos` to a per-locale shape that doesn't overlap our permissive reader (OE also returns the already flattened form), so route the cast through `unknown`.
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
        // Absent means visible: OE only ever sends `false` to hide a field, and an older payload without the flag must not blank the whole form.
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

/** Load a form's authored content for one locale. */
export const loadFormContentForLang = cache(async (marker: string, lang: Lang): Promise<FormContent> => {
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

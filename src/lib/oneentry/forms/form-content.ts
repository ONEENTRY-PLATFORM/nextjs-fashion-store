/**
 * Form-content shapes shared by server loaders and Client Components.
 *
 * Split out of `placeholders.ts` so the client can import the types and the
 * empty constant without pulling in the loader — which reaches for
 * `next/root-params`, and that module is server-only. Importing it from a
 * `'use client'` file is a hard build error, not a runtime one.
 */

/**
 * One form attribute's copy, as authored in the OneEntry admin panel:
 *   title   ← `localizeInfos.title`
 *   fields  ← `additionalFields` flattened to `{fieldMarker: value}`
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

/** Neutral value used whenever OE has no form, or is unreachable. */
export const EMPTY_FORM_CONTENT: FormContent = {
  title: '',
  titleForSite: '',
  successMessage: '',
  unsuccessMessage: '',
  attributes: {},
};

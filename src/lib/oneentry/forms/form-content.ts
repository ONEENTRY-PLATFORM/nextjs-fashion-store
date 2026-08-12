/**
 * Form-content shapes shared by server loaders and Client Components.
 *
 * Split out of `placeholders.ts` so the client can import the types and the
 * empty constant without pulling in the loader — which reaches for
 * `next/root-params`, and that module is server-only. Importing it from a
 * `'use client'` file is a hard build error, not a runtime one.
 */

/**
 * A field's server-side constraints, decoded from the attribute's
 * `validators` block in the admin panel.
 *
 * These are the rules OE itself enforces when the order (or any form data) is
 * POSTed. The storefront mirrors them client-side so a value that OE would
 * reject is caught under the input instead of surfacing as a raw
 * `required values are missing or incorrect: <marker>` at the last checkout
 * step.
 *
 * `min` / `max` are `null` when the admin left the limit at `0` — OE treats
 * that as "no bound", not "length must be zero".
 */
export interface FieldLimits {
  /** `requiredValidator` — the field must carry a non-empty value. */
  required: boolean;
  /** `stringInspectionValidator.stringMin`, or `null` when unbounded. */
  min: number | null;
  /** `stringInspectionValidator.stringMax`, or `null` when unbounded. */
  max: number | null;
  /** `emailInspectionValidator` — value must parse as an e-mail address. */
  email: boolean;
}

/** No constraints — the shape returned for an attribute OE didn't hand us. */
export const NO_FIELD_LIMITS: FieldLimits = { required: false, min: null, max: null, email: false };

/**
 * One form attribute's copy, as authored in the OneEntry admin panel:
 *   title   ← `localizeInfos.title`
 *   fields  ← `additionalFields` flattened to `{fieldMarker: value}`
 *   options ← `attributes[].listTitles` (for `list` attributes)
 *   limits  ← `validators` decoded to {@link FieldLimits}
 */
export interface FormAttributeContent {
  /** Field label as authored in the admin panel. */
  title: string;
  /** `additionalFields` flattened to `{fieldMarker: value}` — placeholders etc. */
  fields: Record<string, string>;
  /** Option list for `list` attributes, ordered by `position`. */
  options: Array<{ title: string; value: string }>;
  /** Server-side constraints OE enforces on submit. */
  limits: FieldLimits;
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

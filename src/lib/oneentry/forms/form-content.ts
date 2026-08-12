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
  /**
   * `trimValidator` — OE strips surrounding whitespace before it measures the
   * value against `min` / `max`, so the storefront must measure it the same way
   * or a padded string passes here and fails there.
   */
  trim: boolean;
}

/** No constraints — the shape returned for an attribute OE didn't hand us. */
export const NO_FIELD_LIMITS: FieldLimits = { required: false, min: null, max: null, email: false, trim: false };

/**
 * Attribute data type, as OE's `AttributeType` union names it.
 *
 * Widened to `string` because the admin API may grow new types the storefront
 * has not been taught yet; a renderer switching on this must handle the
 * unknown case rather than assume exhaustiveness.
 */
export type FormFieldType = string;

/**
 * One option of a `list`, `radioButton`, or `entity` attribute.
 *
 * `list` options carry a plain string `value` and, optionally, a second line in
 * `extended`. `entity` options instead reference an OE page: `value` is the
 * stringified page id, and `entityId` / `depth` / `parentId` describe its place
 * in the tree — a `depth` of 0 is the containing section, not a selectable
 * choice.
 */
export interface FormFieldOption {
  /** Localized label. */
  title: string;
  /** Submitted value; the stringified page id for `entity` options. */
  value: string;
  /** `extended.value` — the option's secondary line, `''` when unset. */
  extended: string;
  /** Referenced OE page id for `entity` options; `null` for plain lists. */
  entityId: number | null;
  /** Tree depth of an `entity` option; `null` for plain lists. */
  depth: number | null;
  /** Parent page id of an `entity` option; `null` at the root or for lists. */
  parentId: number | null;
}

/**
 * One form attribute, as authored in the OneEntry admin panel:
 *   marker      ← `attributes[].marker`
 *   type        ← `attributes[].type`
 *   position    ← `attributes[].position`
 *   isVisible   ← `attributes[].isVisible`
 *   title       ← `localizeInfos.title`
 *   placeholder ← the `additionalFields` entry whose marker starts `placeholder`
 *   fields      ← `additionalFields` flattened to `{fieldMarker: value}`
 *   options     ← `listTitles` (for `list` / `radioButton` / `entity`)
 *   limits      ← `validators` decoded to {@link FieldLimits}
 *
 * Everything a field needs to render and validate itself is here, which is what
 * lets checkout drive its inputs off the form rather than off a marker table
 * compiled into the bundle.
 */
export interface FormAttributeContent {
  /** Attribute marker — the key this entry is filed under. */
  marker: string;
  /** Attribute data type; picks the control a renderer mounts. */
  type: FormFieldType;
  /** Sort position within the form, ascending. */
  position: number;
  /** `false` hides the field from the storefront. */
  isVisible: boolean;
  /** Field label as authored in the admin panel. */
  title: string;
  /**
   * Input placeholder.
   *
   * Admins name this additional field per attribute (`placeholder_city`,
   * `placeholder_address_line_1`, sometimes a bare `placeholder`), so it is
   * resolved by the `placeholder` prefix rather than by an exact marker.
   */
  placeholder: string;
  /** `additionalFields` flattened to `{fieldMarker: value}` — placeholders etc. */
  fields: Record<string, string>;
  /** Option list for `list` / `radioButton` / `entity`, ordered by `position`. */
  options: FormFieldOption[];
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
  /**
   * The same attributes as an ordered list — `position` ascending, hidden ones
   * included so a caller can decide for itself whether to skip them.
   *
   * This is the surface a data-driven renderer walks: field order, labels, and
   * controls all come from here instead of from a hardcoded layout.
   */
  fields: FormAttributeContent[];
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
  fields: [],
};

/** Form-content shapes shared by server loaders and Client Components. */

/** A field's server-side constraints, decoded from the attribute's `validators` block in the admin panel. */
export interface FieldLimits {
  /** `requiredValidator` — the field must carry a non-empty value. */
  required: boolean;
  /** `stringInspectionValidator.stringMin`, or `null` when unbounded. */
  min: number | null;
  /** `stringInspectionValidator.stringMax`, or `null` when unbounded. */
  max: number | null;
  /** `emailInspectionValidator` — value must parse as an e-mail address. */
  email: boolean;
  /** `trimValidator` — OE strips surrounding whitespace before it measures the value against `min` / `max`, so the storefront must measure it the same way or a padded string passes here and fails there. */
  trim: boolean;
}

/** No constraints — the shape returned for an attribute OE didn't hand us. */
export const NO_FIELD_LIMITS: FieldLimits = { required: false, min: null, max: null, email: false, trim: false };

/** Attribute data type, as OE's `AttributeType` union names it. */
export type FormFieldType = string;

/** One option of a `list`, `radioButton`, or `entity` attribute. */
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

/** One form attribute as authored in the OneEntry admin panel — everything a field needs to render and validate itself, so checkout never needs a compiled-in marker table. */
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
  /** Input placeholder. */
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
  /** The same attributes as an ordered list. */
  fields: FormAttributeContent[];
}

/** Legacy shape: `{attributeMarker: {additionalFieldMarker: value}}`. Retained because `useFormPlaceholder` consumers were written against it. */
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

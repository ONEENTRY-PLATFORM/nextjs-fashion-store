/**
 * Find fields inside a loaded OE form by what they *are*, not by their marker.
 *
 * A form's attribute markers are editor-owned strings — renaming one in the
 * admin panel is a content edit, not a deploy. Code that addresses a field by
 * its marker therefore breaks silently: the lookup misses, the feature quietly
 * degrades, and nothing fails loudly enough to notice. Its `type`, `position`,
 * and validators are structural, so they are what these helpers match on.
 *
 * Client-safe: pure functions over {@link FormContent}, no loader imports.
 */
import type { FormAttributeContent, FormContent, FormFieldOption, FormFieldType } from './form-content';

/**
 * Additional-field marker carrying an attribute's role.
 *
 * Type and position identify every checkout field except the address and
 * contact inputs: those are six-to-seven interchangeable `string` attributes
 * whose order differs between forms (`user_addresses` has a label the guest
 * form does not). The admin panel is where that meaning now lives — each of
 * those attributes carries `field_role`, so the storefront asks "which field is
 * the postcode" instead of asserting what the postcode is called.
 */
export const FIELD_ROLE_MARKER = 'field_role';

/**
 * Roles the checkout screens ask for.
 *
 * Not a closed set as far as the CMS is concerned — an editor may tag anything
 * — but these are the ones a layout has a slot for.
 */
export type FieldRole = 'fullName' | 'phone' | 'email' | 'line1' | 'city' | 'postcode' | 'instructions' | 'label';

/**
 * Visible fields of a form, in the order the admin panel arranged them.
 *
 * @param form - Loaded form, or `undefined` when it never loaded.
 * @returns Ordered fields; empty when nothing was loaded.
 */
export function visibleFields(form: FormContent | undefined | null): FormAttributeContent[] {
  return (form?.fields ?? []).filter((f) => f.isVisible);
}

/**
 * Visible fields of one attribute type.
 *
 * @param form - Loaded form, or `undefined`.
 * @param type - OE attribute type, e.g. `'string'` or `'entity'`.
 * @returns Matching fields in form order.
 */
export function fieldsOfType(form: FormContent | undefined | null, type: FormFieldType): FormAttributeContent[] {
  return visibleFields(form).filter((f) => f.type === type);
}

/**
 * The single field of a given type, when a form is expected to have exactly one.
 *
 * @param form - Loaded form, or `undefined`.
 * @param type - OE attribute type.
 * @returns The field, or `undefined` when the form has none — or more than one,
 *          which means the assumption no longer holds and the caller should not
 *          silently pick a winner.
 */
export function soleFieldOfType(
  form: FormContent | undefined | null,
  type: FormFieldType,
): FormAttributeContent | undefined {
  const matches = fieldsOfType(form, type);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * The field an editor tagged with a given role.
 *
 * @param form - Loaded form, or `undefined`.
 * @param role - Role to look for, as authored in `field_role`.
 * @returns The field, or `undefined` when no visible attribute carries that
 *          role — which means the layout has a slot the form does not fill, and
 *          the caller should say so rather than guess a marker.
 */
export function fieldByRole(
  form: FormContent | undefined | null,
  role: FieldRole,
): FormAttributeContent | undefined {
  return visibleFields(form).find((f) => f.fields[FIELD_ROLE_MARKER] === role);
}

/**
 * Marker of the field tagged with a role.
 *
 * @param form - Loaded form, or `undefined`.
 * @param role - Role to look for.
 * @returns The attribute marker, or `undefined` when the role is unfilled.
 */
export function markerForRole(form: FormContent | undefined | null, role: FieldRole): string | undefined {
  return fieldByRole(form, role)?.marker;
}

/**
 * Selectable options of an `entity` field.
 *
 * OE returns the containing section as the first row of the list (`depth: 0`,
 * no parent) followed by the pages themselves. The section is a heading, not a
 * choice — submitting its id would reference a category rather than, say, a
 * store.
 *
 * @param field - An `entity` field, or `undefined`.
 * @returns Selectable options in admin order; empty when there are none.
 */
export function selectableEntityOptions(field: FormAttributeContent | undefined): FormFieldOption[] {
  return (field?.options ?? []).filter((o) => o.depth !== 0 && o.entityId != null);
}

/**
 * OE page ids the form offers for its `entity` field.
 *
 * The admin panel is where an editor decides which pages a shopper may pick —
 * which stores accept pickup, for instance. Reading that decision here keeps a
 * de-selected page out of the picker instead of letting the shopper choose it
 * and have OE reject the order.
 *
 * @param form - Loaded form, or `undefined`.
 * @returns Page ids in admin order; empty when the form has no `entity` field.
 */
export function entityOptionIds(form: FormContent | undefined | null): number[] {
  const ids: number[] = [];
  for (const field of fieldsOfType(form, 'entity')) {
    for (const option of selectableEntityOptions(field)) {
      if (option.entityId != null && !ids.includes(option.entityId)) ids.push(option.entityId);
    }
  }
  return ids;
}

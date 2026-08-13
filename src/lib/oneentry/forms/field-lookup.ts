/** Find fields inside a loaded OE form by what they *are*, not by their marker. */
import type { FormAttributeContent, FormContent, FormFieldOption, FormFieldType } from './form-content';

/** Additional-field marker carrying an attribute's role. */
export const FIELD_ROLE_MARKER = 'field_role';

/** Roles the checkout screens ask for. */
export type FieldRole = 'fullName' | 'phone' | 'email' | 'line1' | 'city' | 'postcode' | 'instructions' | 'label';

/** Visible fields of a form, in the order the admin panel arranged them. */
export function visibleFields(form: FormContent | undefined | null): FormAttributeContent[] {
  return (form?.fields ?? []).filter((f) => f.isVisible);
}

/** Visible fields of one attribute type. */
export function fieldsOfType(form: FormContent | undefined | null, type: FormFieldType): FormAttributeContent[] {
  return visibleFields(form).filter((f) => f.type === type);
}

/** The single field of a given type, when a form is expected to have exactly one. */
export function soleFieldOfType(
  form: FormContent | undefined | null,
  type: FormFieldType,
): FormAttributeContent | undefined {
  const matches = fieldsOfType(form, type);
  return matches.length === 1 ? matches[0] : undefined;
}

/** The field an editor tagged with a given role. */
export function fieldByRole(form: FormContent | undefined | null, role: FieldRole): FormAttributeContent | undefined {
  return visibleFields(form).find((f) => f.fields[FIELD_ROLE_MARKER] === role);
}

/** Marker of the field tagged with a role. */
export function markerForRole(form: FormContent | undefined | null, role: FieldRole): string | undefined {
  return fieldByRole(form, role)?.marker;
}

/** Selectable options of an `entity` field. */
export function selectableEntityOptions(field: FormAttributeContent | undefined): FormFieldOption[] {
  return (field?.options ?? []).filter((o) => o.depth !== 0 && o.entityId != null);
}

/** OE page ids the form offers for its `entity` field. */
export function entityOptionIds(form: FormContent | undefined | null): number[] {
  const ids: number[] = [];
  for (const field of fieldsOfType(form, 'entity')) {
    for (const option of selectableEntityOptions(field)) {
      if (option.entityId != null && !ids.includes(option.entityId)) ids.push(option.entityId);
    }
  }
  return ids;
}

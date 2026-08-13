'use client';
import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { fieldByRole, type FieldRole } from './field-lookup';
// From the client-safe module, not `./placeholders` — that one imports `next/root-params`, which cannot appear in a client bundle.
import { EMPTY_FORM_CONTENT, type FieldLimits, type FormContent, NO_FIELD_LIMITS } from './form-content';

type FormsMap = Record<string, FormContent>;

const FormPlaceholdersContext = createContext<FormsMap>({});

/** Supplies OneEntry form content (labels, placeholders, option lists, result messages) to client components, keyed by form marker. */
export function FormPlaceholdersProvider({ forms, children }: { forms: FormsMap; children: ReactNode }) {
  const inherited = useContext(FormPlaceholdersContext);
  const merged = useMemo(() => ({ ...inherited, ...forms }), [inherited, forms]);
  return <FormPlaceholdersContext.Provider value={merged}>{children}</FormPlaceholdersContext.Provider>;
}

/** Whole-form content, or an empty shell when the form was not loaded. */
export function useFormContent(formMarker: string): FormContent {
  return useContext(FormPlaceholdersContext)[formMarker] ?? EMPTY_FORM_CONTENT;
}

/** Every form the enclosing providers supplied, keyed by marker. */
export function useAllFormContent(): Readonly<FormsMap> {
  return useContext(FormPlaceholdersContext);
}

/** Read a form attribute's input placeholder. */
export function useFieldPlaceholder(formMarker: string, attrMarker: string, fallback: string): string {
  const forms = useContext(FormPlaceholdersContext);
  const value = forms[formMarker]?.attributes?.[attrMarker]?.placeholder;
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** Placeholder and label of the field an editor tagged with a role. */
export function useRoleField(
  formMarker: string,
  role: FieldRole,
  fallback: { label?: string; placeholder?: string } = {},
): { label: string; placeholder: string; marker: string | undefined } {
  const forms = useContext(FormPlaceholdersContext);
  const field = fieldByRole(forms[formMarker], role);
  return {
    label: field?.title || (fallback.label ?? ''),
    placeholder: field?.placeholder || (fallback.placeholder ?? ''),
    marker: field?.marker,
  };
}

/** Read the constraints OE enforces on one form field. */
export function useFieldLimits(formMarker: string, attrMarker: string): FieldLimits {
  const forms = useContext(FormPlaceholdersContext);
  return forms[formMarker]?.attributes?.[attrMarker]?.limits ?? NO_FIELD_LIMITS;
}

/** Read a form field's label (`localizeInfos.title` on the attribute). */
export function useFormLabel(formMarker: string, attrMarker: string, fallback: string): string {
  const forms = useContext(FormPlaceholdersContext);
  const value = forms[formMarker]?.attributes?.[attrMarker]?.title;
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** Read a form-level message authored in the admin panel. */
export function useFormMessage(
  formMarker: string,
  key: 'title' | 'titleForSite' | 'successMessage' | 'unsuccessMessage',
  fallback: string,
): string {
  const forms = useContext(FormPlaceholdersContext);
  const value = forms[formMarker]?.[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** Read a `list` attribute's options, falling back to a local list. */
export function useFormOptions(
  formMarker: string,
  attrMarker: string,
  fallback: ReadonlyArray<{ title: string; value: string }>,
): ReadonlyArray<{ title: string; value: string }> {
  const forms = useContext(FormPlaceholdersContext);
  const options = forms[formMarker]?.attributes?.[attrMarker]?.options;
  return options && options.length > 0 ? options : fallback;
}

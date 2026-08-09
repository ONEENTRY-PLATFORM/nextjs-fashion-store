'use client';
import { createContext, type ReactNode, useContext, useMemo } from 'react';

// From the client-safe module, not `./placeholders` — that one imports
// `next/root-params`, which cannot appear in a client bundle.
import { EMPTY_FORM_CONTENT, type FormContent } from './form-content';

type FormsMap = Record<string, FormContent>;

const FormPlaceholdersContext = createContext<FormsMap>({});

/**
 * Supplies OneEntry form content (labels, placeholders, option lists, result
 * messages) to client components, keyed by form marker.
 *
 * Load the value on the server with `loadFormContent(marker)`.
 *
 * Nested providers **merge with** the enclosing one rather than replacing it:
 * the root layout supplies site-wide forms (the footer newsletter renders on
 * every route) while a route adds its own on top. Replacing would blank the
 * footer's copy on exactly those routes.
 */
export function FormPlaceholdersProvider({ forms, children }: { forms: FormsMap; children: ReactNode }) {
  const inherited = useContext(FormPlaceholdersContext);
  const merged = useMemo(() => ({ ...inherited, ...forms }), [inherited, forms]);
  return <FormPlaceholdersContext.Provider value={merged}>{children}</FormPlaceholdersContext.Provider>;
}

/**
 * Whole-form content, or an empty shell when the form was not loaded.
 */
export function useFormContent(formMarker: string): FormContent {
  return useContext(FormPlaceholdersContext)[formMarker] ?? EMPTY_FORM_CONTENT;
}

/**
 * Read a single placeholder from a form attribute's `additionalFields`.
 *  Returns the `fallback` when the form, attribute, or field is missing
 *  (so screens never render with a blank input).
 */
export function useFormPlaceholder(
  formMarker: string,
  attrMarker: string,
  fieldMarker: string,
  fallback: string,
): string {
  const forms = useContext(FormPlaceholdersContext);
  const value = forms[formMarker]?.attributes?.[attrMarker]?.fields?.[fieldMarker];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * Read a form field's label (`localizeInfos.title` on the attribute).
 */
export function useFormLabel(formMarker: string, attrMarker: string, fallback: string): string {
  const forms = useContext(FormPlaceholdersContext);
  const value = forms[formMarker]?.attributes?.[attrMarker]?.title;
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * Read a form-level message authored in the admin panel.
 */
export function useFormMessage(
  formMarker: string,
  key: 'title' | 'titleForSite' | 'successMessage' | 'unsuccessMessage',
  fallback: string,
): string {
  const forms = useContext(FormPlaceholdersContext);
  const value = forms[formMarker]?.[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * Read a `list` attribute's options, falling back to a local list.
 */
export function useFormOptions(
  formMarker: string,
  attrMarker: string,
  fallback: ReadonlyArray<{ title: string; value: string }>,
): ReadonlyArray<{ title: string; value: string }> {
  const forms = useContext(FormPlaceholdersContext);
  const options = forms[formMarker]?.attributes?.[attrMarker]?.options;
  return options && options.length > 0 ? options : fallback;
}

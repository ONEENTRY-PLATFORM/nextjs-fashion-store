'use client';
import { createContext, type ReactNode, useContext, useMemo } from 'react';

// From the client-safe module, not `./placeholders` — that one imports
// `next/root-params`, which cannot appear in a client bundle.
import { EMPTY_FORM_CONTENT, type FieldLimits, type FormContent, NO_FIELD_LIMITS } from './form-content';

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
 * Every form the enclosing providers supplied, keyed by marker.
 *
 * For callers that work across forms rather than against one — collecting the
 * attribute labels of all checkout forms, say — instead of naming each marker
 * and re-reading the context per form.
 */
export function useAllFormContent(): Readonly<FormsMap> {
  return useContext(FormPlaceholdersContext);
}

/**
 * Read a form attribute's input placeholder.
 *
 * The placeholder's own marker is not part of the call: admins name it per
 * attribute (`placeholder_city`, `placeholder_address_line_1`, or a bare
 * `placeholder`) and the loader resolves it by prefix. Naming it here meant a
 * one-character difference between two forms' spelling silently blanked the
 * input — which is what `placeholder_address_line1` vs `..._line_1` did.
 *
 * @param formMarker - Form the field belongs to.
 * @param attrMarker - Attribute whose placeholder to read.
 * @param fallback   - Shown when the form, attribute, or placeholder is absent,
 *                     so a screen never renders a bare input.
 * @returns The authored placeholder, or `fallback`.
 */
export function useFieldPlaceholder(formMarker: string, attrMarker: string, fallback: string): string {
  const forms = useContext(FormPlaceholdersContext);
  const value = forms[formMarker]?.attributes?.[attrMarker]?.placeholder;
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * Read the constraints OE enforces on one form field.
 *
 * Returns {@link NO_FIELD_LIMITS} when the form (or the attribute) was not
 * loaded, so callers can always build a schema — an unloaded form simply adds
 * no bounds on top of the storefront's own.
 */
export function useFieldLimits(formMarker: string, attrMarker: string): FieldLimits {
  const forms = useContext(FormPlaceholdersContext);
  return forms[formMarker]?.attributes?.[attrMarker]?.limits ?? NO_FIELD_LIMITS;
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

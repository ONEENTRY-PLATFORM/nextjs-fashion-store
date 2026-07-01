'use client'
import { createContext, useContext, type ReactNode } from 'react';
import type { FormPlaceholders } from './placeholders';

type FormsMap = Record<string, FormPlaceholders>;

const FormPlaceholdersContext = createContext<FormsMap>({});

export function FormPlaceholdersProvider({
  forms,
  children,
}: {
  forms: FormsMap;
  children: ReactNode;
}) {
  return (
    <FormPlaceholdersContext.Provider value={forms}>
      {children}
    </FormPlaceholdersContext.Provider>
  );
}

/** Read a single placeholder string from the OE form attribute set.
 *  Returns the `fallback` when the form, attribute, or field is missing
 *  (so screens never render with a blank input). */
export function useFormPlaceholder(
  formMarker: string,
  attrMarker: string,
  fieldMarker: string,
  fallback: string,
): string {
  const forms = useContext(FormPlaceholdersContext);
  const value = forms[formMarker]?.[attrMarker]?.[fieldMarker];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

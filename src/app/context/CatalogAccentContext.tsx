'use client'
import { createContext, useContext } from 'react';

/** Accent color for the current catalog section (women/men/sale/etc.). */
export const CatalogAccentContext = createContext<string>('#000000');

export function useCatalogAccent() {
  return useContext(CatalogAccentContext);
}

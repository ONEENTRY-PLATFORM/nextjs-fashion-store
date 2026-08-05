'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { CatalogPageDict } from './catalog-page-types';

const Ctx = createContext<CatalogPageDict | null>(null);

export function CatalogPageLabelsProvider({
  data,
  children,
}: {
  data: CatalogPageDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** Read a catalog-chrome label, falling back to the local constant. */
export function useCatalogPageT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}

'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { InfoPageDict } from './info-page-types';

const Ctx = createContext<InfoPageDict | null>(null);

export function InfoPageLabelsProvider({
  data,
  children,
}: {
  data: InfoPageDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** Read an info-page label, falling back to the local constant. */
export function useInfoPageT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}

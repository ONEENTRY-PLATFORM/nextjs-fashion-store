'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { mergeDict } from './dict';
import type { NewArrivalsPageDict } from './new-arrivals-page-types';

const Ctx = createContext<NewArrivalsPageDict | null>(null);

export function NewArrivalsPageLabelsProvider({
  data,
  children,
}: {
  data: NewArrivalsPageDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useNewArrivalsPageT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}

/** Overlay a whole local dictionary with the admin panel's values — see `dict.ts`. */
export function useNewArrivalsPageDict<T extends Record<string, unknown>>(prefix: string, fallbacks: T): T {
  const dict = useContext(Ctx);
  return useMemo(() => mergeDict(dict ?? undefined, prefix, fallbacks), [dict, prefix, fallbacks]);
}

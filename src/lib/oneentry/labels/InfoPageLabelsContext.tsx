'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { mergeDict } from './dict';
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

/** Overlay a whole local dictionary with the admin panel's values — see `dict.ts`. */
export function useInfoPageDict<T extends Record<string, unknown>>(prefix: string, fallbacks: T): T {
  const dict = useContext(Ctx);
  return useMemo(() => mergeDict(dict ?? undefined, prefix, fallbacks), [dict, prefix, fallbacks]);
}

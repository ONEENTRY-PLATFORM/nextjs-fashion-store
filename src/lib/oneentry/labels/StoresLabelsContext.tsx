'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { mergeDict } from './dict';
import type { StoresSetMarker, StoresSystemTexts } from './stores-types';

const Ctx = createContext<StoresSystemTexts | null>(null);

export function StoresLabelsProvider({
  data,
  children,
}: {
  data: StoresSystemTexts;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useStoresT(
  set: StoresSetMarker,
  key: string,
  fallback: string,
): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[set]?.[key] ?? fallback;
}

/** Overlay a whole local dictionary with the admin panel's values — see `dict.ts`. */
export function useStoresDict<T extends Record<string, unknown>>(
  set: StoresSetMarker,
  prefix: string,
  fallbacks: T,
): T {
  const data = useContext(Ctx);
  const dict = data?.[set];
  return useMemo(() => mergeDict(dict, prefix, fallbacks), [dict, prefix, fallbacks]);
}

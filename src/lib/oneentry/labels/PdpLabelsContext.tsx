'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { mergeDict } from './dict';
import type { PdpSetMarker, PdpSystemTexts } from './pdp-types';

const Ctx = createContext<PdpSystemTexts | null>(null);

export function PdpLabelsProvider({
  data,
  children,
}: {
  data: PdpSystemTexts;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function usePdpT(
  set: PdpSetMarker,
  key: string,
  fallback: string,
): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[set]?.[key] ?? fallback;
}

/** Overlay a whole local dictionary with the admin panel's values — see `dict.ts`. */
export function usePdpDict<T extends Record<string, unknown>>(
  set: PdpSetMarker,
  prefix: string,
  fallbacks: T,
): T {
  const data = useContext(Ctx);
  const dict = data?.[set];
  return useMemo(() => mergeDict(dict, prefix, fallbacks), [dict, prefix, fallbacks]);
}

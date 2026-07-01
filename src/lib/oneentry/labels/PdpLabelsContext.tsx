'use client';
import { createContext, useContext, type ReactNode } from 'react';
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

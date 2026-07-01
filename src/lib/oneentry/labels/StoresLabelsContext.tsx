'use client';
import { createContext, useContext, type ReactNode } from 'react';
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

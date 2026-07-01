'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { InterfaceControlsDict } from './interface-controls-types';

const Ctx = createContext<InterfaceControlsDict | null>(null);

export function InterfaceControlsLabelsProvider({
  data,
  children,
}: {
  data: InterfaceControlsDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useInterfaceControlsT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}

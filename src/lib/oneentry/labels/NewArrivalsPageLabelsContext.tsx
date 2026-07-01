'use client';
import { createContext, useContext, type ReactNode } from 'react';
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

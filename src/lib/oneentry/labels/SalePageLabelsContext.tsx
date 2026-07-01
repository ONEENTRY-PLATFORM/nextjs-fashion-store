'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { SalePageDict } from './sale-page-types';

const Ctx = createContext<SalePageDict | null>(null);

export function SalePageLabelsProvider({
  data,
  children,
}: {
  data: SalePageDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useSalePageT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}

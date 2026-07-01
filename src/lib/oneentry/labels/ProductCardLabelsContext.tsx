'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { ProductCardDict } from './product-card-types';

const Ctx = createContext<ProductCardDict | null>(null);

export function ProductCardLabelsProvider({
  data,
  children,
}: {
  data: ProductCardDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useProductCardT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}

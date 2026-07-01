'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { FavoritesPageDict } from './favorites-page-types';

const Ctx = createContext<FavoritesPageDict | null>(null);

export function FavoritesPageLabelsProvider({
  data,
  children,
}: {
  data: FavoritesPageDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useFavoritesPageT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}

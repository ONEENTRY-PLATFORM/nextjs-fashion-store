'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { YourBagDict } from './your-bag-types';

const Ctx = createContext<YourBagDict | null>(null);

export function YourBagLabelsProvider({
  data,
  children,
}: {
  data: YourBagDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useYourBagT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}

'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { FooterDict } from './footer-types';

const Ctx = createContext<FooterDict | null>(null);

export function FooterLabelsProvider({
  data,
  children,
}: {
  data: FooterDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** Read a footer branding string, falling back to the local constant. */
export function useFooterT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}

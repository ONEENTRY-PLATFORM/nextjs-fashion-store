'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { mergeDict } from './dict';
import type { SystemPagesDict } from './system-pages-types';

const Ctx = createContext<SystemPagesDict | null>(null);

export function SystemPagesLabelsProvider({
  data,
  children,
}: {
  data: SystemPagesDict;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useSystemPagesT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[key] ?? fallback;
}

/** Overlay a whole local dictionary with the admin panel's values — see `dict.ts`. */
export function useSystemPagesDict<T extends Record<string, unknown>>(prefix: string, fallbacks: T): T {
  const dict = useContext(Ctx);
  return useMemo(() => mergeDict(dict ?? undefined, prefix, fallbacks), [dict, prefix, fallbacks]);
}

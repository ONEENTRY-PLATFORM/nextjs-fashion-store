'use client';

import { createContext, type ReactNode, useContext } from 'react';

import type { CmsLocale } from './locales';

/** Active project locales, published to Client Components. */
const Ctx = createContext<CmsLocale[]>([]);

/** Publish the locales loaded server-side by `loadLocales()`. */
export function LocalesProvider({ data, children }: { data: CmsLocale[]; children: ReactNode }) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** Active locales from the OneEntry project settings. */
export function useCmsLocales(): CmsLocale[] {
  return useContext(Ctx);
}

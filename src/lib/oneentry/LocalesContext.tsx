'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { CmsLocale } from './locales';

/**
 * Active project locales, published to Client Components.
 *
 * Lives apart from the dictionary because it is structure, not copy: the header
 * language switcher renders one entry per locale the tenant actually publishes,
 * whereas the dictionary answers "what does this marker say".
 */
const Ctx = createContext<CmsLocale[]>([]);

/**
 * Publish the locales loaded server-side by `loadLocales()`.
 * @param   {object}       props          - Provider props.
 * @param   {CmsLocale[]}  props.data     - Active locales, admin-panel order.
 * @param   {ReactNode}    props.children - Subtree that reads the locales.
 * @returns {ReactNode}                   The provided subtree.
 */
export function LocalesProvider({
  data,
  children,
}: {
  data: CmsLocale[];
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/**
 * Active locales from the OneEntry project settings.
 *
 * Adding a locale in the admin panel surfaces it here. Returns an empty array
 * when the CMS is unreachable; callers decide whether to hide the switcher or
 * show their default.
 * @returns {CmsLocale[]} Active locales, or `[]` when unavailable.
 */
export function useCmsLocales(): CmsLocale[] {
  return useContext(Ctx);
}
